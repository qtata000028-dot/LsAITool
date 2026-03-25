import type { BillDocumentWorkbenchProps } from './bill-document-workbench';

export type BuildBillDocumentWorkbenchPropsInput = {
  activeBillResizeId: BillDocumentWorkbenchProps['state']['activeBillResizeId'];
  activeMenuName: BillDocumentWorkbenchProps['state']['activeMenuName'];
  billDetailTableBuilderNode: BillDocumentWorkbenchProps['nodes']['billDetailTableBuilderNode'];
  billDocumentPaperRef: BillDocumentWorkbenchProps['refs']['billDocumentPaperRef'];
  billDocumentScale: BillDocumentWorkbenchProps['state']['billDocumentScale'];
  billDocumentTone: BillDocumentWorkbenchProps['state']['billDocumentTone'];
  billDocumentViewportRef: BillDocumentWorkbenchProps['refs']['billDocumentViewportRef'];
  billFieldLivePreview: BillDocumentWorkbenchProps['state']['billFieldLivePreview'];
  billFormDefaultFontSize: BillDocumentWorkbenchProps['constants']['billFormDefaultFontSize'];
  billFormDefaultWidth: BillDocumentWorkbenchProps['constants']['billFormDefaultWidth'];
  billFormMaxWidth: BillDocumentWorkbenchProps['constants']['billFormMaxWidth'];
  billFormMinWidth: BillDocumentWorkbenchProps['constants']['billFormMinWidth'];
  billHeaderCanvasRef: BillDocumentWorkbenchProps['refs']['billHeaderCanvasRef'];
  billHeaderWorkbenchDrag: BillDocumentWorkbenchProps['state']['billHeaderWorkbenchDrag'];
  billHeaderWorkbenchDropTarget: BillDocumentWorkbenchProps['state']['billHeaderWorkbenchDropTarget'];
  billHeaderWorkbenchMinRows: BillDocumentWorkbenchProps['constants']['billHeaderWorkbenchMinRows'];
  billMetaFields: BillDocumentWorkbenchProps['state']['billMetaFields'];
  clampValue: BillDocumentWorkbenchProps['helpers']['clampValue'];
  commitBillHeaderFields: BillDocumentWorkbenchProps['actions']['commitBillHeaderFields'];
  conditionPanelRowGap: BillDocumentWorkbenchProps['constants']['conditionPanelRowGap'];
  conditionPanelRowHeight: BillDocumentWorkbenchProps['constants']['conditionPanelRowHeight'];
  createRuntimeClassName: BillDocumentWorkbenchProps['helpers']['createRuntimeClassName'];
  createRuntimeDeclarationBlock: BillDocumentWorkbenchProps['helpers']['createRuntimeDeclarationBlock'];
  deleteSelectedColumns: BillDocumentWorkbenchProps['actions']['deleteSelectedColumns'];
  designerWorkbenchDraggableItem: BillDocumentWorkbenchProps['dnd']['DesignerWorkbenchDraggableItem'];
  designerWorkbenchDropLane: BillDocumentWorkbenchProps['dnd']['DesignerWorkbenchDropLane'];
  designerWorkbenchRowActiveClass: BillDocumentWorkbenchProps['dnd']['rowActiveClass'];
  designerWorkbenchRowEmptyClass: BillDocumentWorkbenchProps['dnd']['rowEmptyClass'];
  designerWorkbenchSensors: BillDocumentWorkbenchProps['dnd']['sensors'];
  getBillHeaderDragItemId: BillDocumentWorkbenchProps['helpers']['getBillHeaderDragItemId'];
  getBillHeaderDropItemId: BillDocumentWorkbenchProps['helpers']['getBillHeaderDropItemId'];
  getBillHeaderRowCount: BillDocumentWorkbenchProps['helpers']['getBillHeaderRowCount'];
  getBillHeaderRowDropId: BillDocumentWorkbenchProps['helpers']['getBillHeaderRowDropId'];
  getCompactWorkbenchItemClass: BillDocumentWorkbenchProps['helpers']['getCompactWorkbenchItemClass'];
  getOrderedBillHeaderFields: BillDocumentWorkbenchProps['helpers']['getOrderedBillHeaderFields'];
  isConfigFullscreenActive: BillDocumentWorkbenchProps['state']['isConfigFullscreenActive'];
  joinRuntimeDeclarationBlocks: BillDocumentWorkbenchProps['helpers']['joinRuntimeDeclarationBlocks'];
  mainTableColumns: BillDocumentWorkbenchProps['state']['mainTableColumns'];
  moveBillHeaderField: BillDocumentWorkbenchProps['actions']['moveBillHeaderField'];
  normalizeColumn: BillDocumentWorkbenchProps['helpers']['normalizeColumn'];
  renderFieldPreview: BillDocumentWorkbenchProps['helpers']['renderFieldPreview'];
  selectedMainColId: BillDocumentWorkbenchProps['state']['selectedMainColId'];
  selectedMainForDelete: BillDocumentWorkbenchProps['state']['selectedMainForDelete'];
  selectedTableConfigScope: BillDocumentWorkbenchProps['state']['selectedTableConfigScope'];
  setBillDocumentTone: BillDocumentWorkbenchProps['actions']['setBillDocumentTone'];
  setBillHeaderWorkbenchDrag: BillDocumentWorkbenchProps['actions']['setBillHeaderWorkbenchDrag'];
  setBillHeaderWorkbenchDropTarget: BillDocumentWorkbenchProps['actions']['setBillHeaderWorkbenchDropTarget'];
  setBuilderSelectionContextMenu: BillDocumentWorkbenchProps['actions']['setBuilderSelectionContextMenu'];
  setSelectedMainForDelete: BillDocumentWorkbenchProps['actions']['setSelectedMainForDelete'];
  showToast: BillDocumentWorkbenchProps['actions']['showToast'];
  startBillFieldResize: BillDocumentWorkbenchProps['actions']['startBillFieldResize'];
  workspaceThemeTableSurfaceClass: BillDocumentWorkbenchProps['state']['workspaceThemeTableSurfaceClass'];
  workspaceThemeVars: BillDocumentWorkbenchProps['state']['workspaceThemeVars'];
  activateColumnSelection: BillDocumentWorkbenchProps['actions']['activateColumnSelection'];
  activateSourceGridSelection: BillDocumentWorkbenchProps['actions']['activateSourceGridSelection'];
  activateTableConfigSelection: BillDocumentWorkbenchProps['actions']['activateTableConfigSelection'];
  autoArrangeBillHeaderFields: BillDocumentWorkbenchProps['actions']['autoArrangeBillHeaderFields'];
  buildColumn: BillDocumentWorkbenchProps['actions']['buildColumn'];
};

export function buildBillDocumentWorkbenchProps(
  input: BuildBillDocumentWorkbenchPropsInput,
): BillDocumentWorkbenchProps {
  return {
    state: {
      activeBillResizeId: input.activeBillResizeId,
      activeMenuName: input.activeMenuName,
      billDocumentScale: input.billDocumentScale,
      billDocumentTone: input.billDocumentTone,
      billFieldLivePreview: input.billFieldLivePreview,
      billHeaderWorkbenchDrag: input.billHeaderWorkbenchDrag,
      billHeaderWorkbenchDropTarget: input.billHeaderWorkbenchDropTarget,
      billMetaFields: input.billMetaFields,
      isConfigFullscreenActive: input.isConfigFullscreenActive,
      mainTableColumns: input.mainTableColumns,
      selectedMainColId: input.selectedMainColId,
      selectedMainForDelete: input.selectedMainForDelete,
      selectedTableConfigScope: input.selectedTableConfigScope,
      workspaceThemeTableSurfaceClass: input.workspaceThemeTableSurfaceClass,
      workspaceThemeVars: input.workspaceThemeVars,
    },
    refs: {
      billDocumentPaperRef: input.billDocumentPaperRef,
      billDocumentViewportRef: input.billDocumentViewportRef,
      billHeaderCanvasRef: input.billHeaderCanvasRef,
    },
    nodes: {
      billDetailTableBuilderNode: input.billDetailTableBuilderNode,
    },
    actions: {
      activateColumnSelection: input.activateColumnSelection,
      activateSourceGridSelection: input.activateSourceGridSelection,
      activateTableConfigSelection: input.activateTableConfigSelection,
      autoArrangeBillHeaderFields: input.autoArrangeBillHeaderFields,
      buildColumn: input.buildColumn,
      commitBillHeaderFields: input.commitBillHeaderFields,
      deleteSelectedColumns: input.deleteSelectedColumns,
      moveBillHeaderField: input.moveBillHeaderField,
      setBillDocumentTone: input.setBillDocumentTone,
      setBillHeaderWorkbenchDrag: input.setBillHeaderWorkbenchDrag,
      setBillHeaderWorkbenchDropTarget: input.setBillHeaderWorkbenchDropTarget,
      setBuilderSelectionContextMenu: input.setBuilderSelectionContextMenu,
      setSelectedMainForDelete: input.setSelectedMainForDelete,
      showToast: input.showToast,
      startBillFieldResize: input.startBillFieldResize,
    },
    helpers: {
      clampValue: input.clampValue,
      createRuntimeClassName: input.createRuntimeClassName,
      createRuntimeDeclarationBlock: input.createRuntimeDeclarationBlock,
      getBillHeaderDragItemId: input.getBillHeaderDragItemId,
      getBillHeaderDropItemId: input.getBillHeaderDropItemId,
      getBillHeaderRowCount: input.getBillHeaderRowCount,
      getBillHeaderRowDropId: input.getBillHeaderRowDropId,
      getCompactWorkbenchItemClass: input.getCompactWorkbenchItemClass,
      getOrderedBillHeaderFields: input.getOrderedBillHeaderFields,
      joinRuntimeDeclarationBlocks: input.joinRuntimeDeclarationBlocks,
      normalizeColumn: input.normalizeColumn,
      renderFieldPreview: input.renderFieldPreview,
    },
    dnd: {
      DesignerWorkbenchDraggableItem: input.designerWorkbenchDraggableItem,
      DesignerWorkbenchDropLane: input.designerWorkbenchDropLane,
      rowActiveClass: input.designerWorkbenchRowActiveClass,
      rowEmptyClass: input.designerWorkbenchRowEmptyClass,
      sensors: input.designerWorkbenchSensors,
    },
    constants: {
      billFormDefaultFontSize: input.billFormDefaultFontSize,
      billFormDefaultWidth: input.billFormDefaultWidth,
      billFormMaxWidth: input.billFormMaxWidth,
      billFormMinWidth: input.billFormMinWidth,
      billHeaderWorkbenchMinRows: input.billHeaderWorkbenchMinRows,
      conditionPanelRowGap: input.conditionPanelRowGap,
      conditionPanelRowHeight: input.conditionPanelRowHeight,
    },
  };
}
