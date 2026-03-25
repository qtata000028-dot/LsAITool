import React from 'react';

import { BillDocumentWorkbench } from './bill-document-workbench';
import {
  buildBillDocumentWorkbenchProps,
  type BuildBillDocumentWorkbenchPropsInput,
} from './bill-document-workbench-props';

type BuildDashboardBillDocumentWorkbenchNodeInput = {
  state: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'activeBillResizeId'
    | 'activeMenuName'
    | 'billDetailTableBuilderNode'
    | 'billDocumentScale'
    | 'billDocumentTone'
    | 'billFieldLivePreview'
    | 'billHeaderWorkbenchDrag'
    | 'billHeaderWorkbenchDropTarget'
    | 'billMetaFields'
    | 'isConfigFullscreenActive'
    | 'mainTableColumns'
    | 'selectedMainColId'
    | 'selectedMainForDelete'
    | 'selectedTableConfigScope'
    | 'workspaceThemeTableSurfaceClass'
    | 'workspaceThemeVars'
  >;
  refs: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'billDocumentPaperRef'
    | 'billDocumentViewportRef'
    | 'billHeaderCanvasRef'
  >;
  actions: Pick<BuildBillDocumentWorkbenchPropsInput,
    | 'activateColumnSelection'
    | 'activateSourceGridSelection'
    | 'activateTableConfigSelection'
    | 'autoArrangeBillHeaderFields'
    | 'buildColumn'
    | 'commitBillHeaderFields'
    | 'deleteSelectedColumns'
    | 'moveBillHeaderField'
    | 'setBillDocumentTone'
    | 'setBillHeaderWorkbenchDrag'
    | 'setBillHeaderWorkbenchDropTarget'
    | 'setBuilderSelectionContextMenu'
    | 'setSelectedMainForDelete'
    | 'showToast'
    | 'startBillFieldResize'
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

export function buildDashboardBillDocumentWorkbenchNode(
  input: BuildDashboardBillDocumentWorkbenchNodeInput,
) {
  const billDocumentWorkbenchProps = buildBillDocumentWorkbenchProps({
    ...input.state,
    ...input.refs,
    ...input.actions,
    ...input.helpers,
    ...input.dnd,
    ...input.constants,
  });

  return <BillDocumentWorkbench {...billDocumentWorkbenchProps} />;
}
