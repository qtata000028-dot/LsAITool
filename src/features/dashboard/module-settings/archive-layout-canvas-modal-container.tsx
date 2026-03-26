import React from 'react';

import { ArchiveLayoutDesignerBridge } from './archive-layout-designer-bridge';
import { useArchiveLayoutPaletteColumns } from './use-archive-layout-palette-columns';

type ArchiveLayoutCanvasModalContainerProps = {
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
    currentModuleCode,
    isOpen,
    mainTableColumns,
    onUpdateDetailBoard,
    onShowToast,
  });

  return (
    <ArchiveLayoutDesignerBridge
      currentDetailBoard={currentDetailBoard}
      isOpen={isOpen}
      mainTableColumns={layoutPaletteColumns}
      normalizeColumn={normalizeColumn}
      onClose={onClose}
      onUpdateDetailBoard={onUpdateDetailBoard}
      renderFieldPreview={renderFieldPreview}
    />
  );
});
