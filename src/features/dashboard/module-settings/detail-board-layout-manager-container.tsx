import React from 'react';
import { DetailBoardLayoutDesignerBridge } from './detail-board-layout-designer-bridge';

type DetailBoardLayoutManagerContainerProps = {
  DesignerWorkbenchDraggableItem: React.ComponentType<any>;
  DesignerWorkbenchDropLane: React.ComponentType<any>;
  activeDetailBoardResize: {
    groupId: string;
    label: string;
    width: number;
  } | null;
  availableGridColumns: Record<string, any>[];
  currentDetailBoard: Record<string, any>;
  designerWorkbenchSensors: any;
  detailBoardClipboardIds: string[];
  detailBoardFieldDefaultWidth: number;
  detailBoardTheme: {
    groupLabel: string;
    groupShell: string;
  };
  emptyFieldsNode: React.ReactNode;
  normalizeColumn: (column: Record<string, any>) => Record<string, any>;
  selectedDetailBoardGroupId: string | null;
  setSelectedDetailBoardGroupId: (groupId: string | null) => void;
  onOpenDetailBoardPreview: (rowId: number) => void;
  onResetDetailBoardFieldWidth: (event: React.MouseEvent<HTMLDivElement>, groupId: string, columnId: string) => void;
  onResetMainSelection: () => void;
  onShowToast: (message: string) => void;
  onStartDetailBoardFieldResize: (event: React.MouseEvent<HTMLDivElement>, groupId: string, columnId: string, label: string) => void;
  onUpdateDetailBoard: (patch: Record<string, any> | ((current: any) => any)) => void;
  parseDetailBoardClipboardColumnIds: (text: string, availableColumns: Record<string, any>[]) => string[];
  renderFieldPreview: (column: Record<string, any>, index: number, scope: string) => React.ReactNode;
};

export const DetailBoardLayoutManagerContainer = React.memo(function DetailBoardLayoutManagerContainer({
  availableGridColumns,
  currentDetailBoard,
  emptyFieldsNode,
  normalizeColumn,
  selectedDetailBoardGroupId,
  setSelectedDetailBoardGroupId,
  onOpenDetailBoardPreview,
  onShowToast,
  onUpdateDetailBoard,
  renderFieldPreview,
}: DetailBoardLayoutManagerContainerProps) {
  return (
    <DetailBoardLayoutDesignerBridge
      availableGridColumns={availableGridColumns}
      currentDetailBoard={currentDetailBoard}
      emptyFieldsNode={emptyFieldsNode}
      normalizeColumn={normalizeColumn}
      onOpenDetailBoardPreview={onOpenDetailBoardPreview}
      onShowToast={onShowToast}
      onUpdateDetailBoard={onUpdateDetailBoard}
      renderFieldPreview={renderFieldPreview}
      selectedDetailBoardGroupId={selectedDetailBoardGroupId}
      setSelectedDetailBoardGroupId={setSelectedDetailBoardGroupId}
    />
  );
});
