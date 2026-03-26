import React from 'react';
import { ArchiveLayoutCanvasModal } from './archive-layout-canvas-modal';
import type { LayoutFieldWorkbenchMetaResolver } from './layout-field-workbench-meta';
import { useArchiveLayoutEditor } from './use-archive-layout-editor';
import { useArchiveLayoutPaletteColumns } from './use-archive-layout-palette-columns';

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
  currentModuleCode: string;
  getDetailBoardFieldLiveHeight: (groupId: string, columnId: string, fallbackHeight: number) => number;
  getDetailBoardFieldLiveWidth: (groupId: string, columnId: string, fallbackWidth: number) => number;
  getLayoutFieldWorkbenchMeta: LayoutFieldWorkbenchMetaResolver;
  isOpen: boolean;
  mainTableColumns: Record<string, any>[];
  onShowToast: (message: string) => void;
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
  currentModuleCode,
  getDetailBoardFieldLiveHeight,
  getDetailBoardFieldLiveWidth,
  getLayoutFieldWorkbenchMeta,
  isOpen,
  mainTableColumns,
  onShowToast,
  onClose,
  onResetDetailBoardFieldHeight,
  onResetDetailBoardFieldWidth,
  onStartDetailBoardFieldHeightResize,
  onStartDetailBoardFieldResize,
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

  const archiveLayoutEditor = useArchiveLayoutEditor({
    currentDetailBoard,
    isOpen,
    mainTableColumns: layoutPaletteColumns,
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
      mainTableColumns={layoutPaletteColumns}
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
