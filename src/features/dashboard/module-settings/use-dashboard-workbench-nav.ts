import { type Dispatch, type SetStateAction, useCallback } from 'react';

import { updateCurrentDesignSearch } from '../../../platforms/design/navigation/design-navigation';

type SyncWorkspaceUrlState = (patch: Partial<{
  configOpen: boolean;
  configStep: number | null;
  detailPreview: boolean;
  mode: string | null;
  moduleCode: string | null;
  theme: string | null;
  workbench: 'modules' | 'research-record' | null;
}>, options?: { replace?: boolean }) => void;

export function useDashboardWorkbenchNav({
  setActiveWorkbench,
  syncWorkspaceUrlState,
}: {
  setActiveWorkbench: Dispatch<SetStateAction<'modules' | 'research-record'>>;
  syncWorkspaceUrlState?: SyncWorkspaceUrlState;
}) {
  const openResearchRecordWorkbench = useCallback(() => {
    setActiveWorkbench('research-record');
    if (syncWorkspaceUrlState) {
      syncWorkspaceUrlState({ workbench: 'research-record' }, { replace: true });
      return;
    }

    updateCurrentDesignSearch({ workbench: 'research-record' }, { replace: true });
  }, [setActiveWorkbench, syncWorkspaceUrlState]);

  const closeResearchRecordWorkbench = useCallback(() => {
    setActiveWorkbench('modules');
    if (syncWorkspaceUrlState) {
      syncWorkspaceUrlState({ workbench: null }, { replace: true });
      return;
    }

    updateCurrentDesignSearch({ workbench: null }, { replace: true });
  }, [setActiveWorkbench, syncWorkspaceUrlState]);

  return {
    closeResearchRecordWorkbench,
    openResearchRecordWorkbench,
  };
}
