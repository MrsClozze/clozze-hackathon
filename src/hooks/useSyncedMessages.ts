import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SyncedMessage {
  id: string;
  external_message_id: string;
  source: string;
  direction: string;
  sender_phone: string | null;
  sender_name: string | null;
  recipient_phone: string | null;
  message_body: string | null;
  received_at: string;
  is_read: boolean;
  ai_analyzed: boolean;
  ai_requires_action: boolean;
  ai_priority: string | null;
  ai_action_item: string | null;
  ai_category: string | null;
  ai_ignored: boolean;
}

export function useSyncedMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<SyncedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('synced_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching synced messages:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const ignoreMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('synced_messages')
        .update({ ai_ignored: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, ai_ignored: true } : m
      ));
    } catch (err) {
      console.error('Error ignoring message:', err);
      toast({
        title: "Error",
        description: "Failed to ignore message",
        variant: "destructive",
      });
    }
  }, [toast]);

  const restoreMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('synced_messages')
        .update({ ai_ignored: false })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, ai_ignored: false } : m
      ));
    } catch (err) {
      console.error('Error restoring message:', err);
      toast({
        title: "Error",
        description: "Failed to restore message",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Filter messages by source
  const whatsappMessages = messages.filter(m => m.source === 'whatsapp');
  
  // Needs attention: analyzed, not ignored, and has priority/action/requires_action
  const actionRequiredMessages = messages.filter(
    m => m.ai_analyzed && 
         !m.ai_ignored && 
         m.direction === 'inbound' &&
         (m.ai_requires_action || m.ai_priority || m.ai_action_item)
  );

  // All messages that aren't ignored
  const allVisibleMessages = messages.filter(m => !m.ai_ignored);

  // Ignored messages
  const ignoredMessages = messages.filter(m => m.ai_ignored);

  return {
    messages,
    whatsappMessages,
    actionRequiredMessages,
    allVisibleMessages,
    ignoredMessages,
    loading,
    refresh: fetchMessages,
    ignoreMessage,
    restoreMessage,
  };
}
