import React from 'react';
import { ArchiveLayoutDesignerBridge } from './archive-layout-designer-bridge';

type ArchiveLayoutCanvasModalContainerProps = {
  currentDetailBoard: Record<string, any>;
  isOpen: boolean;
  mainTableColumns: Record<string, any>[];
  normalizeColumn: (column: Record<string, any>) => Record<string, any>;
  onClose: () => void;
  onUpdateDetailBoard: (patch: Record<string, any> | ((current: any) => any)) => void;
  renderFieldPreview: (column: Record<string, any>, index: number, scope: string) => React.ReactNode;
};

export const ArchiveLayoutCanvasModalContainer = React.memo(function ArchiveLayoutCanvasModalContainer({
  currentDetailBoard,
  isOpen,
  mainTableColumns,
  normalizeColumn,
  onClose,
  onUpdateDetailBoard,
  renderFieldPreview,
}: ArchiveLayoutCanvasModalContainerProps) {
  return (
    <ArchiveLayoutDesignerBridge
      currentDetailBoard={currentDetailBoard}
      isOpen={isOpen}
      mainTableColumns={mainTableColumns}
      normalizeColumn={normalizeColumn}
      onClose={onClose}
      onUpdateDetailBoard={onUpdateDetailBoard}
      renderFieldPreview={renderFieldPreview}
    />
  );
});
