import type { BuildBillDocumentWorkbenchPropsInput } from './bill-document-workbench-props';
import { buildDashboardBillDocumentWorkbenchNode } from './dashboard-bill-document-workbench-node';

type BuildDashboardBillDocumentWorkbenchBridgeInput = {
  canvas: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'activeMenuName'
    | 'billDetailTableBuilderNode'
    | 'billDocumentScale'
    | 'billDocumentTone'
    | 'isConfigFullscreenActive'
    | 'workspaceThemeTableSurfaceClass'
    | 'workspaceThemeVars'
  >;
  fields: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'activeBillResizeId'
    | 'billFieldLivePreview'
    | 'billHeaderWorkbenchDrag'
    | 'billHeaderWorkbenchDropTarget'
    | 'billMetaFields'
    | 'mainTableColumns'
    | 'selectedMainColId'
    | 'selectedMainForDelete'
    | 'selectedTableConfigScope'
  >;
  refs: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'billDocumentPaperRef'
    | 'billDocumentViewportRef'
    | 'billHeaderCanvasRef'
  >;
  selectionActions: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'activateColumnSelection'
    | 'activateSourceGridSelection'
    | 'activateTableConfigSelection'
    | 'deleteSelectedColumns'
    | 'setBuilderSelectionContextMenu'
    | 'setSelectedMainForDelete'
  >;
  headerActions: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'autoArrangeBillHeaderFields'
    | 'buildColumn'
    | 'commitBillHeaderFields'
    | 'moveBillHeaderField'
    | 'setBillHeaderWorkbenchDrag'
    | 'setBillHeaderWorkbenchDropTarget'
    | 'startBillFieldResize'
  >;
  feedbackActions: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'setBillDocumentTone'
    | 'showToast'
  >;
  helpers: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'clampValue'
    | 'createRuntimeClassName'
    | 'createRuntimeDeclarationBlock'
    | 'getBillHeaderDragItemId'
    | 'getBillHeaderDropItemId'
    | 'getBillHeaderRowCount'
    | 'getBillHeaderRowDropId'
    | 'getCompactWorkbenchItemClass'
    | 'getOrderedBillHeaderFields'
    | 'joinRuntimeDeclarationBlocks'
    | 'normalizeColumn'
    | 'renderFieldPreview'
  >;
  dnd: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'designerWorkbenchDraggableItem'
    | 'designerWorkbenchDropLane'
    | 'designerWorkbenchRowActiveClass'
    | 'designerWorkbenchRowEmptyClass'
    | 'designerWorkbenchSensors'
  >;
  constants: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'billFormDefaultFontSize'
    | 'billFormDefaultWidth'
    | 'billFormMaxWidth'
    | 'billFormMinWidth'
    | 'billHeaderWorkbenchMinRows'
    | 'conditionPanelRowGap'
    | 'conditionPanelRowHeight'
  >;
};

export function buildDashboardBillDocumentWorkbenchBridge(
  input: BuildDashboardBillDocumentWorkbenchBridgeInput,
) {
  return buildDashboardBillDocumentWorkbenchNode({
    state: {
      ...input.canvas,
      ...input.fields,
    },
    refs: input.refs,
    actions: {
      ...input.selectionActions,
      ...input.headerActions,
      ...input.feedbackActions,
    },
    helpers: input.helpers,
    dnd: input.dnd,
    constants: input.constants,
  });
}
