import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DocuSignEnvelope {
  id: string;
  envelope_id: string;
  subject: string;
  status: string;
  task_id: string | null;
  buyer_id: string | null;
  listing_id: string | null;
  recipients: any[];
  document_name: string | null;
  sent_at: string | null;
  completed_at: string | null;
  voided_at: string | null;
  created_at: string;
}

export function useDocuSignEnvelopes(filters?: { taskId?: string; buyerId?: string; listingId?: string }) {
  const { user } = useAuth();
  const [envelopes, setEnvelopes] = useState<DocuSignEnvelope[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnvelopes = useCallback(async () => {
    if (!user) {
      setEnvelopes([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('docusign_envelopes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters?.taskId) query = query.eq('task_id', filters.taskId);
      if (filters?.buyerId) query = query.eq('buyer_id', filters.buyerId);
      if (filters?.listingId) query = query.eq('listing_id', filters.listingId);

      const { data, error } = await query;
      if (error) throw error;
      setEnvelopes((data as DocuSignEnvelope[]) || []);
    } catch (err) {
      console.error('Error fetching DocuSign envelopes:', err);
    } finally {
      setLoading(false);
    }
  }, [user, filters?.taskId, filters?.buyerId, filters?.listingId]);

  useEffect(() => {
    fetchEnvelopes();
  }, [fetchEnvelopes]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('docusign-envelopes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'docusign_envelopes',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchEnvelopes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchEnvelopes]);

  const sendEnvelope = useCallback(async (params: {
    documents: { documentBase64: string; documentName: string; documentId: string }[];
    recipients: { name: string; email: string }[];
    emailSubject?: string;
    emailBlurb?: string;
    taskId?: string;
    buyerId?: string;
    listingId?: string;
    enableReminders?: boolean;
    enableExpiration?: boolean;
  }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('sync-docusign', {
      body: {
        action: 'send_envelope',
        ...params,
      },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) throw new Error(response.error.message);
    if (response.data?.error) throw new Error(response.data.error);

    await fetchEnvelopes();
    return response.data?.data;
  }, [fetchEnvelopes]);

  const refreshStatus = useCallback(async (envelopeId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.functions.invoke('sync-docusign', {
      body: { action: 'check_status', envelopeId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    await fetchEnvelopes();
  }, [fetchEnvelopes]);

  const downloadSignedDocument = useCallback(async (envelopeId: string): Promise<Blob | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('sync-docusign', {
      body: { action: 'download_document', envelopeId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) throw new Error(response.error.message);
    if (response.data?.error) throw new Error(response.data.error);

    // The response contains base64 PDF
    const base64 = response.data?.data?.documentBase64;
    if (!base64) return null;

    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/pdf' });
  }, []);

  return { envelopes, loading, sendEnvelope, refreshStatus, downloadSignedDocument, refetch: fetchEnvelopes };
}
