import { useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchSingleTableDesignerControls,
  fetchSingleTableDesignerGroups,
  fetchSingleTableDesignerLayout,
  type SingleTableDesignerControlDto,
  type SingleTableDesignerGroupDto,
  type SingleTableDesignerLayoutDto,
} from '../../../lib/backend-module-config';
import { buildArchiveLayoutDesignerState } from './archive-layout-designer-backend';

type UseArchiveLayoutPaletteColumnsOptions = {
  currentModuleCode: string;
  isOpen: boolean;
  mainTableColumns: Record<string, any>[];
  onUpdateDetailBoard: (patch: Record<string, any> | ((current: any) => any)) => void;
  onShowToast: (message: string) => void;
};

type ArchiveLayoutDesignerPayload = {
  controlRows: SingleTableDesignerControlDto[];
  groupRows: SingleTableDesignerGroupDto[];
  layoutRows: SingleTableDesignerLayoutDto[];
  moduleCode: string;
};

function getDashboardErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to load archive layout data.';
}

export function useArchiveLayoutPaletteColumns({
  currentModuleCode,
  isOpen,
  mainTableColumns,
  onUpdateDetailBoard,
  onShowToast,
}: UseArchiveLayoutPaletteColumnsOptions) {
  const [designerPayload, setDesignerPayload] = useState<ArchiveLayoutDesignerPayload | null>(null);
  const loadTokenRef = useRef<string | null>(null);
  const requestedModuleCodeRef = useRef<string>('');
  const onShowToastRef = useRef(onShowToast);
  const onUpdateDetailBoardRef = useRef(onUpdateDetailBoard);

  useEffect(() => {
    onShowToastRef.current = onShowToast;
  }, [onShowToast]);

  useEffect(() => {
    onUpdateDetailBoardRef.current = onUpdateDetailBoard;
  }, [onUpdateDetailBoard]);

  const moduleCode = currentModuleCode.trim();
  const shouldLoadDesigner = isOpen && Boolean(moduleCode);

  useEffect(() => {
    if (!shouldLoadDesigner) {
      loadTokenRef.current = null;
      requestedModuleCodeRef.current = '';
      return;
    }

    requestedModuleCodeRef.current = moduleCode;

    let isActive = true;

    const loadDesignerColumns = async () => {
      try {
        const loadToken = `${moduleCode}:${Date.now()}`;
        loadTokenRef.current = loadToken;

        const [controlRows, groupRows, layoutRows] = await Promise.all([
          fetchSingleTableDesignerControls(moduleCode),
          fetchSingleTableDesignerGroups(moduleCode),
          fetchSingleTableDesignerLayout(moduleCode),
        ]);

        if (!isActive || loadTokenRef.current !== loadToken) {
          return;
        }

        setDesignerPayload({
          controlRows,
          groupRows,
          layoutRows,
          moduleCode,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setDesignerPayload(null);
        onShowToastRef.current(getDashboardErrorMessage(error));
      }
    };

    void loadDesignerColumns();

    return () => {
      isActive = false;
    };
  }, [moduleCode, shouldLoadDesigner]);

  const effectiveDesignerPayload = useMemo(() => {
    if (!shouldLoadDesigner) {
      return null;
    }

    if (designerPayload?.moduleCode === moduleCode) {
      return designerPayload;
    }

    return null;
  }, [designerPayload, moduleCode, shouldLoadDesigner]);

  const designerState = useMemo(() => {
    if (!effectiveDesignerPayload) {
      return null;
    }

    return buildArchiveLayoutDesignerState(
      effectiveDesignerPayload.moduleCode,
      effectiveDesignerPayload.controlRows,
      effectiveDesignerPayload.groupRows,
      effectiveDesignerPayload.layoutRows,
      mainTableColumns,
    );
  }, [effectiveDesignerPayload, mainTableColumns]);

  useEffect(() => {
    if (!isOpen || !designerState || !effectiveDesignerPayload) {
      return;
    }

    onUpdateDetailBoardRef.current((current: any) => {
      const hasSameModuleDirtyLayout = Boolean(
        current?.archiveLayoutDirty
        && current?.archiveLayoutSource?.moduleCode === effectiveDesignerPayload.moduleCode,
      );

      if (hasSameModuleDirtyLayout) {
        return current;
      }

      return {
        ...current,
        ...designerState.detailBoardPatch,
      };
    });
  }, [effectiveDesignerPayload, designerState, isOpen]);

  return useMemo(
    () => (designerState?.mappedColumns && designerState.mappedColumns.length > 0 ? designerState.mappedColumns : mainTableColumns),
    [designerState, mainTableColumns],
  );
}
