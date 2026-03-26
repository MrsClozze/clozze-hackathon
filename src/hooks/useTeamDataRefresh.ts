import { useEffect } from "react";

const TEAM_DATA_REFRESH_EVENT = "clozze:team-data-refresh";

export function emitTeamDataRefresh() {
  window.dispatchEvent(new Event(TEAM_DATA_REFRESH_EVENT));
}

/**
 * Listen for cross-component team data refresh signals (same tab).
 * Use this to keep Team dashboard + Settings in sync after mutations.
 */
export function useTeamDataRefresh(onRefresh: () => void) {
  useEffect(() => {
    const handler = () => onRefresh();
    window.addEventListener(TEAM_DATA_REFRESH_EVENT, handler);
    return () => window.removeEventListener(TEAM_DATA_REFRESH_EVENT, handler);
  }, [onRefresh]);
}
