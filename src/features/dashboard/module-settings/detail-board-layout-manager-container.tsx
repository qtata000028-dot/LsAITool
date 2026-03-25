import React from 'react';
import { DetailBoardLayoutManager } from './detail-board-layout-manager';
import { useDetailBoardLayoutManager } from './use-detail-board-layout-manager';

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
  DesignerWorkbenchDraggableItem,
  DesignerWorkbenchDropLane,
  activeDetailBoardResize,
  availableGridColumns,
  currentDetailBoard,
  designerWorkbenchSensors,
  detailBoardClipboardIds,
  detailBoardFieldDefaultWidth,
  detailBoardTheme,
  emptyFieldsNode,
  normalizeColumn,
  selectedDetailBoardGroupId,
  setSelectedDetailBoardGroupId,
  onOpenDetailBoardPreview,
  onResetDetailBoardFieldWidth,
  onResetMainSelection,
  onShowToast,
  onStartDetailBoardFieldResize,
  onUpdateDetailBoard,
  parseDetailBoardClipboardColumnIds,
  renderFieldPreview,
}: DetailBoardLayoutManagerContainerProps) {
  const layoutManager = useDetailBoardLayoutManager({
    availableGridColumns,
    currentDetailBoard,
    selectedDetailBoardGroupId,
    setSelectedDetailBoardGroupId,
    onResetMainSelection,
    onShowToast,
    onUpdateDetailBoard,
    parseDetailBoardClipboardColumnIds,
  });

  return (
    <DetailBoardLayoutManager
      DesignerWorkbenchDraggableItem={DesignerWorkbenchDraggableItem}
      DesignerWorkbenchDropLane={DesignerWorkbenchDropLane}
      activeDetailBoardResize={activeDetailBoardResize}
      availableGridColumns={availableGridColumns}
      availableUnassignedDetailColumns={layoutManager.availableUnassignedDetailColumns}
      designerWorkbenchSensors={designerWorkbenchSensors}
      detailBoardClipboardIds={detailBoardClipboardIds}
      detailBoardFieldDefaultWidth={detailBoardFieldDefaultWidth}
      detailBoardReady={layoutManager.detailBoardReady}
      detailBoardTheme={detailBoardTheme}
      detailBoardWorkbenchDrag={layoutManager.detailBoardWorkbenchDrag}
      detailBoardWorkbenchDropTarget={layoutManager.detailBoardWorkbenchDropTarget}
      emptyFieldsNode={emptyFieldsNode}
      groups={currentDetailBoard.groups}
      normalizeColumn={normalizeColumn}
      onAddDetailGroup={layoutManager.addDetailGroup}
      onApplySuggestedDetailLayout={layoutManager.applySuggestedDetailLayout}
      onClearDetailBoardWorkbenchDragState={layoutManager.clearDetailBoardWorkbenchDragState}
      onClearDetailGroups={layoutManager.clearDetailGroups}
      onDeleteSelectedDetailGroup={layoutManager.deleteSelectedDetailGroup}
      onHandleDetailGroupPaste={layoutManager.handleDetailGroupPaste}
      onHandleDetailGroupWorkbenchDragEnd={layoutManager.handleDetailGroupWorkbenchDragEnd}
      onHandleDetailGroupWorkbenchDragOver={layoutManager.handleDetailGroupWorkbenchDragOver}
      onHandleDetailGroupWorkbenchDragStart={layoutManager.handleDetailGroupWorkbenchDragStart}
      onMergeDetailGroupColumns={layoutManager.mergeDetailGroupColumns}
      onOpenDetailBoardPreview={onOpenDetailBoardPreview}
      onRemoveDetailGroupColumn={layoutManager.removeDetailGroupColumn}
      onResetDetailBoardFieldWidth={onResetDetailBoardFieldWidth}
      onSelectDetailGroup={setSelectedDetailBoardGroupId}
      onStartDetailBoardFieldResize={onStartDetailBoardFieldResize}
      onUpdateSelectedDetailGroupName={layoutManager.updateSelectedDetailGroupName}
      onUpdateSelectedDetailGroupRows={layoutManager.updateSelectedDetailGroupRows}
      renderFieldPreview={renderFieldPreview}
      selectedDetailGroup={layoutManager.selectedDetailGroup}
      selectedDetailGroupRowNumbers={layoutManager.selectedDetailGroupRowNumbers}
      selectedDetailGroupRows={layoutManager.selectedDetailGroupRows}
    />
  );
});
