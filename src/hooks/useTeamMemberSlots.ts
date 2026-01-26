import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TeamMemberSlots {
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
  loading: boolean;
}

export function useTeamMemberSlots() {
  const { user, subscription } = useAuth();
  const [slots, setSlots] = useState<TeamMemberSlots>({
    totalSlots: 0,
    usedSlots: 0,
    availableSlots: 0,
    loading: true,
  });

  const fetchSlots = async () => {
    if (!user) {
      setSlots(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-team-member-slots');
      
      if (error) throw error;
      
      setSlots({
        totalSlots: data.totalSlots || 0,
        usedSlots: data.usedSlots || 0,
        availableSlots: data.availableSlots || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching team member slots:', error);
      setSlots(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [user]);

  // Refetch when URL has checkout_success param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout_success') === 'true') {
      // Clear the URL param
      window.history.replaceState({}, '', window.location.pathname);
      // Refetch after a short delay to allow webhook to process
      setTimeout(fetchSlots, 2000);
    }
  }, []);

  const hasTeamMemberAccess = slots.totalSlots > 0;

  return {
    ...slots,
    hasTeamMemberAccess,
    refetch: fetchSlots,
  };
}
