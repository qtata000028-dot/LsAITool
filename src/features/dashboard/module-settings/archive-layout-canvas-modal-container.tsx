import React from 'react';
import { Modal } from 'antd';

import { ArchiveLayoutDesignerBridge } from './archive-layout-designer-bridge';
import { useArchiveLayoutDesignerSave } from './use-archive-layout-designer-save';
import { useArchiveLayoutPaletteColumns } from './use-archive-layout-palette-columns';

type ArchiveLayoutCanvasModalContainerProps = {
  businessType: string;
  currentDetailBoard: Record<string, any>;
  currentModuleCode: string;
  isOpen: boolean;
  mainTableColumns: Record<string, any>[];
  normalizeColumn: (column: Record<string, any>) => Record<string, any>;
  onShowToast: (message: string) => void;
  onClose: () => void;
  onUpdateDetailBoard: (patch: Record<string, any> | ((current: any) => any)) => void;
  renderFieldPreview: (column: Record<string, any>, index: number, scope: string) => React.ReactNode;
};

export const ArchiveLayoutCanvasModalContainer = React.memo(function ArchiveLayoutCanvasModalContainer({
  businessType,
  currentDetailBoard,
  currentModuleCode,
  isOpen,
  mainTableColumns,
  normalizeColumn,
  onShowToast,
  onClose,
  onUpdateDetailBoard,
  renderFieldPreview,
}: ArchiveLayoutCanvasModalContainerProps) {
  const layoutPaletteColumns = useArchiveLayoutPaletteColumns({
    businessType,
    currentModuleCode,
    isOpen,
    mainTableColumns,
    onUpdateDetailBoard,
    onShowToast,
  });
  const {
    isDirty,
    isSaving,
    saveArchiveLayout,
  } = useArchiveLayoutDesignerSave({
    businessType,
    currentDetailBoard,
    currentModuleCode,
    layoutColumns: layoutPaletteColumns,
    onShowToast,
    onUpdateDetailBoard,
  });
  const [autoSaveFailed, setAutoSaveFailed] = React.useState(false);

  const handleSave = React.useCallback(async () => {
    const success = await saveArchiveLayout();
    setAutoSaveFailed(!success);
    return success;
  }, [saveArchiveLayout]);

  React.useEffect(() => {
    if (!isOpen || !isDirty || isSaving) {
      return;
    }

    const timer = window.setTimeout(() => {
      void handleSave();
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [handleSave, isDirty, isOpen, isSaving]);

  const handleRequestClose = React.useCallback(() => {
    if (isSaving) {
      return;
    }

    if (!isDirty && !autoSaveFailed) {
      onClose();
      return;
    }

    Modal.confirm({
      cancelText: '继续编辑',
      centered: true,
      content: autoSaveFailed
        ? '最近一次自动保存失败。是否先保存当前布局，再关闭弹窗？'
        : '当前布局还有未保存的改动。是否先保存，再关闭弹窗？',
      okText: '保存并关闭',
      title: '未保存的布局改动',
      onOk: async () => {
        const success = await handleSave();
        if (success) {
          onClose();
        }
      },
    });
  }, [autoSaveFailed, handleSave, isDirty, isSaving, onClose]);

  return (
    <ArchiveLayoutDesignerBridge
      currentDetailBoard={currentDetailBoard}
      currentModuleCode={currentModuleCode}
      isDirty={isDirty}
      isOpen={isOpen}
      isSaving={isSaving}
      mainTableColumns={layoutPaletteColumns}
      normalizeColumn={normalizeColumn}
      onRequestClose={handleRequestClose}
      onSave={handleSave}
      onUpdateDetailBoard={onUpdateDetailBoard}
      renderFieldPreview={renderFieldPreview}
    />
  );
});
