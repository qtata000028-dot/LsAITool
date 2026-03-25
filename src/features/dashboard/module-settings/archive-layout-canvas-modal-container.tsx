import React from 'react';
import { ArchiveLayoutCanvasModal } from './archive-layout-canvas-modal';
import type { LayoutFieldWorkbenchMetaResolver } from './layout-field-workbench-meta';
import { useArchiveLayoutEditor } from './use-archive-layout-editor';

type ArchiveLayoutCanvasModalContainerProps = {
  activeDetailBoardResize: {
    columnId: string;
    groupId: string;
    label: string;
    maxWidth: number;
    minWidth: number;
    snapCandidates: number[];
    width: number;
  } | null;
  currentDetailBoard: Record<string, any>;
  getDetailBoardFieldLiveHeight: (groupId: string, columnId: string, fallbackHeight: number) => number;
  getDetailBoardFieldLiveWidth: (groupId: string, columnId: string, fallbackWidth: number) => number;
  getLayoutFieldWorkbenchMeta: LayoutFieldWorkbenchMetaResolver;
  isOpen: boolean;
  mainTableColumns: Record<string, any>[];
  onClose: () => void;
  onResetDetailBoardFieldHeight: (event: React.MouseEvent<any>, groupId: string, columnId: string) => void;
  onResetDetailBoardFieldWidth: (event: React.MouseEvent<any>, groupId: string, columnId: string) => void;
  onStartDetailBoardFieldHeightResize: (
    event: React.MouseEvent<any>,
    groupId: string,
    columnId: string,
    label: string,
    minHeightOverride?: number,
  ) => void;
  onStartDetailBoardFieldResize: (
    event: React.MouseEvent<any>,
    groupId: string,
    columnId: string,
    label: string,
    minWidthOverride?: number,
  ) => void;
  onUpdateDetailBoard: (patch: Record<string, any> | ((current: any) => any)) => void;
  renderFieldPreview: (column: Record<string, any>, index: number, scope: string) => React.ReactNode;
};

export const ArchiveLayoutCanvasModalContainer = React.memo(function ArchiveLayoutCanvasModalContainer({
  activeDetailBoardResize,
  currentDetailBoard,
  getDetailBoardFieldLiveHeight,
  getDetailBoardFieldLiveWidth,
  getLayoutFieldWorkbenchMeta,
  isOpen,
  mainTableColumns,
  onClose,
  onResetDetailBoardFieldHeight,
  onResetDetailBoardFieldWidth,
  onStartDetailBoardFieldHeightResize,
  onStartDetailBoardFieldResize,
  onUpdateDetailBoard,
  renderFieldPreview,
}: ArchiveLayoutCanvasModalContainerProps) {
  const archiveLayoutEditor = useArchiveLayoutEditor({
    currentDetailBoard,
    isOpen,
    mainTableColumns,
    onClose,
    onUpdateDetailBoard,
  });

  return (
    <ArchiveLayoutCanvasModal
      activeDetailBoardResize={activeDetailBoardResize}
      archiveLayoutConfig={currentDetailBoard}
      archiveLayoutWorkbenchDrag={archiveLayoutEditor.archiveLayoutWorkbenchDrag}
      archiveLayoutWorkbenchDropTarget={archiveLayoutEditor.archiveLayoutWorkbenchDropTarget}
      assignedFieldCount={archiveLayoutEditor.assignedFieldCount}
      getDetailBoardFieldLiveHeight={getDetailBoardFieldLiveHeight}
      getDetailBoardFieldLiveWidth={getDetailBoardFieldLiveWidth}
      getLayoutFieldWorkbenchMeta={getLayoutFieldWorkbenchMeta}
      highlightedGroup={archiveLayoutEditor.highlightedGroup}
      highlightedGroupId={archiveLayoutEditor.highlightedGroupId}
      isOpen={isOpen}
      mainTableColumns={mainTableColumns}
      onAddArchiveLayoutGroup={archiveLayoutEditor.addArchiveLayoutGroup}
      onClearArchiveLayoutGroups={archiveLayoutEditor.clearArchiveLayoutGroups}
      onClose={archiveLayoutEditor.closeEditor}
      onEndArchiveLayoutDrag={archiveLayoutEditor.clearWorkbenchState}
      onFocusArchiveLayoutGroup={archiveLayoutEditor.focusGroup}
      onHandleArchiveLayoutItemDragOver={archiveLayoutEditor.handleItemDragOver}
      onHandleArchiveLayoutItemDrop={archiveLayoutEditor.handleItemDrop}
      onHandleArchiveLayoutRowDragOver={archiveLayoutEditor.handleRowDragOver}
      onHandleArchiveLayoutRowDrop={archiveLayoutEditor.handleRowDrop}
      onRemoveArchiveLayoutColumn={archiveLayoutEditor.removeArchiveLayoutColumn}
      onRemoveArchiveLayoutGroup={archiveLayoutEditor.removeArchiveLayoutGroup}
      onStartArchiveLayoutFieldDrag={archiveLayoutEditor.startGroupFieldDrag}
      onStartArchiveLayoutPaletteDrag={archiveLayoutEditor.startPaletteDrag}
      onStartDetailBoardFieldHeightResize={onStartDetailBoardFieldHeightResize}
      onStartDetailBoardFieldResize={onStartDetailBoardFieldResize}
      onUpdateArchiveLayoutGroupName={(groupId, name) => archiveLayoutEditor.updateArchiveLayoutGroup(groupId, { name })}
      onUpdateArchiveLayoutGroupRows={archiveLayoutEditor.updateArchiveLayoutGroupRows}
      onResetDetailBoardFieldHeight={onResetDetailBoardFieldHeight}
      onResetDetailBoardFieldWidth={onResetDetailBoardFieldWidth}
      renderFieldPreview={renderFieldPreview}
      unassignedFieldCount={archiveLayoutEditor.unassignedFieldCount}
    />
  );
});
