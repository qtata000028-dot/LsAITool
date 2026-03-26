import React, { useCallback, useMemo } from 'react';

import { FieldBackedDetailLayoutDesigner } from '../detail-layout-designer/components/FieldBackedDetailLayoutDesigner';
import type { DetailLayoutItem } from '../detail-layout-designer/types';
import { areDetailLayoutDocumentsEqual } from '../detail-layout-designer/utils/layout';
import { createSuggestedDetailBoardGroups } from './detail-board-config';
import {
  buildDetailBoardFieldOptions,
  buildDetailBoardFromDesignerLayout,
  buildDetailLayoutDocumentFromDetailBoard,
  getDetailBoardFieldDefaultSize,
} from './detail-board-layout-designer-adapter';

type DetailBoardLayoutDesignerBridgeProps = {
  availableGridColumns: Record<string, any>[];
  currentDetailBoard: Record<string, any>;
  emptyFieldsNode: React.ReactNode;
  normalizeColumn: (column: Record<string, any>) => Record<string, any>;
  onOpenDetailBoardPreview: (previewRows?: number, sortColumnId?: string | null) => void;
  onShowToast: (message: string) => void;
  onUpdateDetailBoard: (patch: Record<string, any> | ((current: any) => any)) => void;
  renderFieldPreview: (column: Record<string, any>, index: number, scope: string) => React.ReactNode;
  selectedDetailBoardGroupId: string | null;
  setSelectedDetailBoardGroupId: (groupId: string | null) => void;
};

export const DetailBoardLayoutDesignerBridge = React.memo(function DetailBoardLayoutDesignerBridge({
  availableGridColumns,
  currentDetailBoard,
  emptyFieldsNode,
  normalizeColumn,
  onOpenDetailBoardPreview,
  onShowToast,
  onUpdateDetailBoard,
  renderFieldPreview,
  selectedDetailBoardGroupId,
  setSelectedDetailBoardGroupId,
}: DetailBoardLayoutDesignerBridgeProps) {
  const hasDesignerLayout = Boolean(currentDetailBoard?.designerLayout?.items?.length);
  const designerDocument = useMemo(
    () => buildDetailLayoutDocumentFromDetailBoard(currentDetailBoard, availableGridColumns, normalizeColumn),
    [availableGridColumns, currentDetailBoard, normalizeColumn],
  );
  const fieldOptions = useMemo(
    () => buildDetailBoardFieldOptions(availableGridColumns, normalizeColumn),
    [availableGridColumns, normalizeColumn],
  );

  const handleDocumentChange = useCallback((nextDocument: any) => {
    const nextDetailBoard = buildDetailBoardFromDesignerLayout(currentDetailBoard, nextDocument);
    const sameDesignerLayout = currentDetailBoard.designerLayout
      ? areDetailLayoutDocumentsEqual(currentDetailBoard.designerLayout, nextDetailBoard.designerLayout)
      : false;
    const sameGroups = JSON.stringify(currentDetailBoard.groups ?? []) === JSON.stringify(nextDetailBoard.groups ?? []);

    if (sameDesignerLayout && sameGroups) {
      return;
    }

    onUpdateDetailBoard(nextDetailBoard);
  }, [currentDetailBoard, onUpdateDetailBoard]);

  const handleSuggestedLayout = useCallback(() => {
    const suggestedGroups = createSuggestedDetailBoardGroups(availableGridColumns);
    const nextDetailBoard = {
      ...currentDetailBoard,
      groups: suggestedGroups,
      designerLayout: null,
    };
    const nextDocument = buildDetailLayoutDocumentFromDetailBoard(nextDetailBoard, availableGridColumns, normalizeColumn);
    onUpdateDetailBoard({
      ...nextDetailBoard,
      designerLayout: nextDocument,
    });
    setSelectedDetailBoardGroupId(suggestedGroups[0]?.id ?? null);
    onShowToast('已应用详情布局推荐方案');
  }, [availableGridColumns, currentDetailBoard, normalizeColumn, onShowToast, onUpdateDetailBoard, setSelectedDetailBoardGroupId]);

  const handleClearLayout = useCallback(() => {
    onUpdateDetailBoard({
      ...currentDetailBoard,
      designerLayout: {
        version: 1,
        gridSize: designerDocument.gridSize,
        items: [],
      },
      groups: [],
    });
    setSelectedDetailBoardGroupId(null);
    onShowToast('已清空详情布局');
  }, [currentDetailBoard, designerDocument.gridSize, onShowToast, onUpdateDetailBoard, setSelectedDetailBoardGroupId]);

  const handleSelectedItemChange = useCallback((item: DetailLayoutItem | null) => {
    if (!item) {
      if (selectedDetailBoardGroupId) {
        setSelectedDetailBoardGroupId(null);
      }
      return;
    }

    const nextGroupId = item.type === 'groupbox' ? item.id : (item.parentId ?? null);
    if (nextGroupId !== selectedDetailBoardGroupId) {
      setSelectedDetailBoardGroupId(nextGroupId);
    }
  }, [selectedDetailBoardGroupId, setSelectedDetailBoardGroupId]);

  if (availableGridColumns.length === 0) {
    return <>{emptyFieldsNode}</>;
  }

  return (
    <FieldBackedDetailLayoutDesigner
      allowFieldEdit={false}
      allowParentIdEdit={false}
      document={designerDocument}
      fieldOptions={fieldOptions}
      getDefaultSize={(rawField) => getDetailBoardFieldDefaultSize(normalizeColumn, rawField)}
      onDocumentChange={handleDocumentChange}
      onSelectedItemChange={handleSelectedItemChange}
      paletteLeadItems={[
        {
          description: '拖入画布后作为详情分组容器。',
          id: 'detail-layout-palette-groupbox',
          label: '分组框',
          type: 'groupbox',
        },
      ]}
      renderFieldPreview={renderFieldPreview}
      toolbarActions={(
        <>
          <div className="inline-flex items-center rounded-xl border border-[color:var(--workspace-accent-border,#bfd0ff)] bg-[color:var(--workspace-accent-soft,rgba(49,98,255,0.08))] px-3 py-2 text-[11px] font-semibold text-[color:var(--workspace-accent-strong,#3152c8)]">
            {hasDesignerLayout ? '当前编辑来源：designerLayout' : '当前编辑来源：legacy groups 已迁入 designerLayout'}
          </div>
          <button
            className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
            onClick={handleSuggestedLayout}
            type="button"
          >
            推荐布局
          </button>
          <button
            className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
            onClick={() => onOpenDetailBoardPreview(1, currentDetailBoard.sortColumnId)}
            type="button"
          >
            预览
          </button>
          <button
            className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
            onClick={handleClearLayout}
            type="button"
          >
            清空
          </button>
        </>
      )}
    />
  );
});
