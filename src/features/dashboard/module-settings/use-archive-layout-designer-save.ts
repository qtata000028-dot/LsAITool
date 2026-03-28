import { useCallback, useMemo, useState } from 'react';

import { saveSingleTableDesignerLayout } from '../../../lib/backend-module-config';
import { buildArchiveLayoutSaveBodies } from './archive-layout-designer-backend';

type UseArchiveLayoutDesignerSaveOptions = {
  currentDetailBoard: Record<string, any>;
  currentModuleCode: string;
  layoutColumns: Record<string, any>[];
  onShowToast: (message: string) => void;
  onUpdateDetailBoard: (patch: Record<string, any> | ((current: any) => any)) => void;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '\u5b9a\u4e49\u8bbe\u8ba1\u4fdd\u5b58\u5931\u8d25\u3002';
}

export function useArchiveLayoutDesignerSave({
  currentDetailBoard,
  currentModuleCode,
  layoutColumns,
  onShowToast,
  onUpdateDetailBoard,
}: UseArchiveLayoutDesignerSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = Boolean(currentDetailBoard?.archiveLayoutDirty);

  const saveArchiveLayout = useCallback(async () => {
    const moduleCode = currentModuleCode.trim();
    if (!moduleCode) {
      onShowToast('\u8bf7\u5148\u4fdd\u5b58\u6a21\u5757\u4fe1\u606f\uff0c\u518d\u4fdd\u5b58\u5b9a\u4e49\u8bbe\u8ba1\u3002');
      return false;
    }

    const saveBodies = buildArchiveLayoutSaveBodies(currentDetailBoard, layoutColumns);
    if (saveBodies.length === 0) {
      onShowToast('\u5f53\u524d\u6ca1\u6709\u53ef\u4fdd\u5b58\u7684\u5b9a\u4e49\u8bbe\u8ba1\u5e03\u5c40\u3002');
      return false;
    }

    setIsSaving(true);
    try {
      for (const body of saveBodies) {
        await saveSingleTableDesignerLayout(moduleCode, body);
      }

      onUpdateDetailBoard((current: any) => {
        const currentSource = current?.archiveLayoutSource && typeof current.archiveLayoutSource === 'object'
          ? current.archiveLayoutSource
          : null;

        return {
          ...current,
          archiveLayoutDirty: false,
          archiveLayoutSource: currentSource
            ? {
              ...currentSource,
              formKey: String(saveBodies[0]?.formKey ?? currentSource.formKey ?? '').trim(),
              layoutRows: saveBodies,
              moduleCode,
            }
            : currentSource,
        };
      });

      onShowToast('\u5b9a\u4e49\u8bbe\u8ba1\u5df2\u4fdd\u5b58\u3002');
      return true;
    } catch (error) {
      onShowToast(getErrorMessage(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [currentDetailBoard, currentModuleCode, layoutColumns, onShowToast, onUpdateDetailBoard]);

  return useMemo(() => ({
    isDirty,
    isSaving,
    saveArchiveLayout,
  }), [isDirty, isSaving, saveArchiveLayout]);
}
