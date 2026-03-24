import { useState, useCallback, useRef, useEffect } from "react";
import { useScribe } from "@elevenlabs/react";
import { parseSpokenResponse } from "@/lib/taskTypeConfigs";
import type { AssistantMessage } from "@/hooks/useTaskAssistant";

export type ConversationState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'processing'
  | 'speaking';

interface UseConversationModeOptions {
  sendMessage: (msg: string, opts?: { conversational?: boolean }) => Promise<void>;
  messages: AssistantMessage[];
  isLoading: boolean;
}

export function useConversationMode({
  sendMessage,
  messages,
  isLoading,
}: UseConversationModeOptions) {
  const [state, _setState] = useState<ConversationState>('idle');
  const stateRef = useRef<ConversationState>('idle');
  const setState = useCallback((s: ConversationState) => {
    stateRef.current = s;
    _setState(s);
  }, []);

  const [liveTranscript, setLiveTranscript] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const wasLoadingRef = useRef(false);
  const processedCountRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);

  // Stable refs for callbacks used inside useScribe (avoids stale closures)
  const handlersRef = useRef({
    onTranscriptCommitted: (_text: string) => {},
    onInterrupt: () => {},
  });

  handlersRef.current = {
    onTranscriptCommitted: (text: string) => {
      setState('processing');
      setLiveTranscript('');
      sendMessage(text, { conversational: true }).catch(() => {
        if (isActiveRef.current) setState('listening');
      });
    },
    onInterrupt: () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setState('listening');
    },
  };

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (stateRef.current === 'listening' && isActiveRef.current) {
      silenceTimerRef.current = setTimeout(() => {
        setLiveTranscript('');
      }, 15000);
    }
  }, []);

  // Scribe STT hook — VAD auto-commits when user stops speaking
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime' as any,
    commitStrategy: 'vad' as any,
    onPartialTranscript: (data: any) => {
      const text = data?.text || '';
      setLiveTranscript(text);

      // Interrupt: user started talking while AI is speaking
      if (stateRef.current === 'speaking' && text.length > 3) {
        handlersRef.current.onInterrupt();
      }

      // Reset silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (stateRef.current === 'listening' && isActiveRef.current) {
        silenceTimerRef.current = setTimeout(() => setLiveTranscript(''), 15000);
      }
    },
    onCommittedTranscript: (data: any) => {
      const text = (data?.text || '').trim();
      if (text && stateRef.current === 'listening' && isActiveRef.current) {
        handlersRef.current.onTranscriptCommitted(text);
      }
    },
  });

  // ---- Watch for AI response completion → trigger TTS ----
  useEffect(() => {
    if (
      wasLoadingRef.current &&
      !isLoading &&
      stateRef.current === 'processing' &&
      isActiveRef.current
    ) {
      const lastMsg = messages[messages.length - 1];
      if (
        lastMsg?.role === 'assistant' &&
        lastMsg.content &&
        messages.length > processedCountRef.current
      ) {
        processedCountRef.current = messages.length;
        playSpokenResponse(lastMsg.content);
      }
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, messages]);

  // ---- Browser speechSynthesis fallback ----
  const playBrowserTTS = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      if (isActiveRef.current) setState('listening');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => {
      if (isActiveRef.current) {
        setState('listening');
        resetSilenceTimer();
      }
    };
    utterance.onerror = () => {
      if (isActiveRef.current) setState('listening');
    };
    window.speechSynthesis.speak(utterance);
  }, [setState, resetSilenceTimer]);

  // ---- TTS playback ----
  const playSpokenResponse = useCallback(async (content: string) => {
    const { spoken } = parseSpokenResponse(content);
    if (!spoken) {
      if (isActiveRef.current) setState('listening');
      return;
    }

    try {
      setState('speaking');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: spoken }),
        },
      );

      if (!response.ok) {
        console.warn(`ElevenLabs TTS failed (${response.status}), falling back to browser speech`);
        playBrowserTTS(spoken);
        return;
      }

      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;

      // May have been interrupted while waiting for TTS
      if (stateRef.current !== 'speaking' || !isActiveRef.current) return;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        audioRef.current = null;
        if (isActiveRef.current) {
          setState('listening');
          resetSilenceTimer();
        }
      };

      audio.onerror = () => {
        audioRef.current = null;
        if (isActiveRef.current) setState('listening');
      };

      await audio.play();
    } catch (err) {
      console.error('Conversation TTS error:', err);
      // Fallback to browser speech
      playBrowserTTS(spoken);
    }
  }, [setState, resetSilenceTimer, playBrowserTTS]);

  // ---- Start / End ----
  const startConversation = useCallback(async () => {
    setState('connecting');
    isActiveRef.current = true;
    processedCountRef.current = messages.length;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-scribe-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        },
      );

      if (!res.ok) throw new Error('Voice token failed');
      const { token } = await res.json();

      await (scribe as any).connect({
        token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setState('listening');
      resetSilenceTimer();
    } catch (err) {
      isActiveRef.current = false;
      setState('idle');
      throw err;
    }
  }, [scribe, setState, resetSilenceTimer, messages.length]);

  const endConversation = useCallback(() => {
    isActiveRef.current = false;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    // Cancel browser speech if active
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      (scribe as any).disconnect();
    } catch {}

    setLiveTranscript('');
    setState('idle');
  }, [scribe, setState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        (scribe as any).disconnect();
      } catch {}
    };
  }, []);

  return {
    state,
    liveTranscript,
    isActive: state !== 'idle',
    startConversation,
    endConversation,
  };
}
