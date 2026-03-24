import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

type VoiceMode = 'idle' | 'recording' | 'playing';

export function useTaskVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('idle');
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastResponseUrlRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (lastResponseUrlRef.current) {
        URL.revokeObjectURL(lastResponseUrlRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    // Use Web Speech API (ElevenLabs Scribe requires SDK integration)
    // This provides good cross-browser support with graceful fallback
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({
        title: "Voice Not Available",
        description: "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    // Stop any playing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingAudio(false);
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + t;
        } else {
          interim = t;
        }
      }
      setTranscript(finalTranscript + (interim ? " " + interim : ""));
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      setVoiceMode('idle');
      if (event.error === "not-allowed") {
        toast({
          title: "Microphone Blocked",
          description: "Please allow microphone access in your browser settings.",
          variant: "destructive",
        });
      } else if (event.error === "no-speech") {
        // Silently handle no-speech — not an error
      } else {
        console.warn("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      setVoiceMode('idle');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setVoiceMode('recording');
    setTranscript("");
  }, [toast]);

  const stopRecording = useCallback((): string => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setVoiceMode('idle');
    return transcript;
  }, [transcript]);

  const playResponse = useCallback(async (text: string) => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAudio(false);
      setVoiceMode('idle');
      return;
    }

    // Strip markdown for cleaner speech
    const cleanText = text
      .replace(/#{1,6}\s/g, "")
      .replace(/\*{1,2}(.*?)\*{1,2}/g, "$1")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/`{1,3}.*?`{1,3}/gs, "")
      .replace(/\[ACTION:.*?\]/g, "")
      .replace(/---/g, "")
      .replace(/^\s*[-*]\s/gm, "") // Remove list markers
      .replace(/\n{2,}/g, ". ") // Convert double newlines to pauses
      .replace(/\n/g, " ")
      .trim()
      .substring(0, 3000)
      .replace(/Clozze/gi, 'Close'); // Correct pronunciation for TTS

    if (!cleanText) return;

    try {
      setIsPlayingAudio(true);
      setVoiceMode('playing');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: cleanText }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const audioBlob = await response.blob();

      // Clean up previous URL
      if (lastResponseUrlRef.current) {
        URL.revokeObjectURL(lastResponseUrlRef.current);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      lastResponseUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlayingAudio(false);
        setVoiceMode('idle');
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        setVoiceMode('idle');
        audioRef.current = null;
      };

      audioRef.current = audio;
      await audio.play();
    } catch (err) {
      console.error("TTS error:", err);
      setIsPlayingAudio(false);
      setVoiceMode('idle');
      toast({
        title: "Voice Playback Error",
        description: "Could not play the response. ElevenLabs may be unavailable.",
        variant: "destructive",
      });
    }
  }, [isPlayingAudio, toast]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setVoiceMode('idle');
  }, []);

  const replayLastResponse = useCallback(() => {
    if (lastResponseUrlRef.current && !isPlayingAudio) {
      const audio = new Audio(lastResponseUrlRef.current);
      audio.onended = () => {
        setIsPlayingAudio(false);
        setVoiceMode('idle');
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        setVoiceMode('idle');
        audioRef.current = null;
      };
      audioRef.current = audio;
      setIsPlayingAudio(true);
      setVoiceMode('playing');
      audio.play();
    }
  }, [isPlayingAudio]);

  const hasLastResponse = !!lastResponseUrlRef.current;

  return {
    isRecording,
    isPlayingAudio,
    voiceMode,
    transcript,
    hasLastResponse,
    setTranscript,
    startRecording,
    stopRecording,
    playResponse,
    stopPlayback,
    replayLastResponse,
  };
}
