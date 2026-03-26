import React, { useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { FieldBackedDetailLayoutDesigner } from '../detail-layout-designer/components/FieldBackedDetailLayoutDesigner';
import { areDetailLayoutDocumentsEqual } from '../detail-layout-designer/utils/layout';
import { createSuggestedDetailBoardGroups } from './detail-board-config';
import {
  buildDetailBoardFieldOptions,
  buildDetailBoardFromDesignerLayout,
  buildDetailLayoutDocumentFromDetailBoard,
  getDetailBoardFieldDefaultSize,
} from './detail-board-layout-designer-adapter';

type ArchiveLayoutDesignerBridgeProps = {
  currentDetailBoard: Record<string, any>;
  isOpen: boolean;
  mainTableColumns: Record<string, any>[];
  normalizeColumn: (column: Record<string, any>) => Record<string, any>;
  onClose: () => void;
  onUpdateDetailBoard: (patch: Record<string, any> | ((current: any) => any)) => void;
  renderFieldPreview: (column: Record<string, any>, index: number, scope: string) => React.ReactNode;
};

export const ArchiveLayoutDesignerBridge = React.memo(function ArchiveLayoutDesignerBridge({
  currentDetailBoard,
  isOpen,
  mainTableColumns,
  normalizeColumn,
  onClose,
  onUpdateDetailBoard,
  renderFieldPreview,
}: ArchiveLayoutDesignerBridgeProps) {
  const hasDesignerLayout = Boolean(currentDetailBoard?.designerLayout?.items?.length);
  const designerDocument = useMemo(
    () => buildDetailLayoutDocumentFromDetailBoard(currentDetailBoard, mainTableColumns, normalizeColumn),
    [currentDetailBoard, mainTableColumns, normalizeColumn],
  );
  const fieldOptions = useMemo(
    () => buildDetailBoardFieldOptions(mainTableColumns, normalizeColumn),
    [mainTableColumns, normalizeColumn],
  );
  const assignedFieldCount = useMemo(
    () => designerDocument.items.filter((item) => typeof item.field === 'string' && item.field.trim().length > 0).length,
    [designerDocument.items],
  );
  const groupCount = useMemo(
    () => designerDocument.items.filter((item) => item.type === 'groupbox' && !item.parentId).length,
    [designerDocument.items],
  );
  const unassignedFieldCount = Math.max(0, mainTableColumns.length - assignedFieldCount);

  useEffect(() => {
    if (!isOpen || currentDetailBoard.enabled) {
      return;
    }

    onUpdateDetailBoard({
      ...currentDetailBoard,
      enabled: true,
    });
  }, [currentDetailBoard, isOpen, onUpdateDetailBoard]);

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
    const suggestedGroups = createSuggestedDetailBoardGroups(mainTableColumns);
    const nextDetailBoard = {
      ...currentDetailBoard,
      enabled: true,
      groups: suggestedGroups,
      designerLayout: null,
    };
    const nextDocument = buildDetailLayoutDocumentFromDetailBoard(nextDetailBoard, mainTableColumns, normalizeColumn);
    onUpdateDetailBoard({
      ...nextDetailBoard,
      designerLayout: nextDocument,
    });
  }, [currentDetailBoard, mainTableColumns, normalizeColumn, onUpdateDetailBoard]);

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
  }, [currentDetailBoard, designerDocument.gridSize, onUpdateDetailBoard]);

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[79] flex items-center justify-center bg-slate-950/42 p-5 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.985 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(event) => event.stopPropagation()}
          className="flex h-[90vh] w-full max-w-[1640px] flex-col overflow-hidden rounded-2xl border border-slate-200/85 bg-white shadow-[0_44px_120px_-36px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-md border border-slate-200/80 bg-white text-[color:var(--workspace-accent)] dark:border-slate-800 dark:bg-slate-950">
                    <span className="material-symbols-outlined text-[18px]">dashboard_customize</span>
                  </div>
                  <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">主表分组布局画布</div>
                </div>
                <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  已切换为统一详情布局设计器。字段和分组框都按绝对布局保存，后续详情入口可直接复用这套交互。
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-200/80 bg-white/82 px-3 py-2 text-[11px] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/76 dark:text-slate-300">
                  <span>分组 {groupCount}</span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span>已排布 {assignedFieldCount}</span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span>待排布 {unassignedFieldCount}</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200/80 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {mainTableColumns.length > 0 ? (
              <FieldBackedDetailLayoutDesigner
                allowFieldEdit={false}
                allowParentIdEdit={false}
                document={designerDocument}
                fieldOptions={fieldOptions}
                getDefaultSize={(rawField) => getDetailBoardFieldDefaultSize(normalizeColumn, rawField)}
                onDocumentChange={handleDocumentChange}
                paletteLeadItems={[
                  {
                    description: '拖入画布后作为主表分组容器。',
                    id: 'archive-layout-palette-groupbox',
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
                      onClick={handleClearLayout}
                      type="button"
                    >
                      清空
                    </button>
                  </>
                )}
              />
            ) : (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/60 text-center dark:border-slate-800 dark:bg-slate-900/30">
                <div className="text-[14px] font-semibold text-slate-700 dark:text-slate-100">还没有主表字段</div>
                <div className="mt-2 max-w-md text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                  先完成主表字段配置，再回来做详情布局设计。这里会直接复用统一的字段型详情布局设计器。
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
