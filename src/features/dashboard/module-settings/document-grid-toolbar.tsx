import React from 'react';
import { Filter, Plus, Save, Table2, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { createRuntimeClassName } from '../designer/runtime-dimension-rules';
import type { WorkbenchResizeMode } from '../resize/use-workbench-resize-state';

export type DocumentGridToolbarFilterConfig = {
  fields: any[];
  selectedId: string | null;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  onActivate: (id: string) => void;
  onAdd: () => void;
  onDelete: () => void;
  setFields: React.Dispatch<React.SetStateAction<any[]>>;
  scope: 'left' | 'main' | 'detail';
};

export type DocumentGridToolbarOptions = {
  hideActionBar?: boolean;
  hideFilterBar?: boolean;
  hideFilterQuickActions?: boolean;
  filterAccessory?: React.ReactNode;
  filterRuntimeRules?: string;
};

type DocumentGridToolbarMetrics = {
  filterControlWidth: number;
  filterResizeMaxWidth: number;
  filterResizeMinWidth: number;
};

export type DocumentGridToolbarProps = {
  columns: any[];
  title: string;
  selectedCount: number;
  onDelete: () => void;
  onAdd: () => void;
  extraActions?: React.ReactNode;
  filterConfig?: DocumentGridToolbarFilterConfig;
  tableConfigAction?: {
    active?: boolean;
    onSelect: () => void;
  };
  options?: DocumentGridToolbarOptions;
  metrics: DocumentGridToolbarMetrics;
  onSetBuilderSelectionContextMenu: React.Dispatch<React.SetStateAction<any>>;
  renderFieldPreview: (rawField: any, rowIndex: number, mode?: 'table' | 'filter' | 'condition') => React.ReactNode;
  startResize: (
    event: React.MouseEvent,
    colId: string,
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    minWidth?: number,
    maxWidth?: number,
    mode?: WorkbenchResizeMode,
  ) => void;
  autoFitColumnWidth: (
    event: React.MouseEvent,
    colId: string,
    cols: any[],
    setCols: React.Dispatch<React.SetStateAction<any[]>>,
    minWidth?: number,
    maxWidth?: number,
    mode?: WorkbenchResizeMode,
  ) => void;
};

export const MemoDocumentGridToolbar = React.memo(function DocumentGridToolbar({
  columns,
  title,
  selectedCount,
  onDelete,
  onAdd,
  extraActions,
  filterConfig,
  tableConfigAction,
  options,
  metrics,
  onSetBuilderSelectionContextMenu,
  renderFieldPreview,
  startResize,
  autoFitColumnWidth,
}: DocumentGridToolbarProps) {
  const filterFields = filterConfig?.fields ?? columns.slice(0, 3);
  const hideFilterBar = options?.hideFilterBar ?? false;
  const hideFilterQuickActions = options?.hideFilterQuickActions ?? false;
  const hideActionBar = options?.hideActionBar ?? false;
  const filterSelectionCount = filterConfig?.selectedIds.length ?? 0;
  const filterRuntimeRules = options?.filterRuntimeRules;

  const buildFilterSelectionIds = (fieldId: string, append: boolean) => {
    if (!filterConfig) return [];
    if (filterConfig.selectedIds.includes(fieldId)) {
      return filterConfig.selectedIds;
    }
    return append ? Array.from(new Set([...filterConfig.selectedIds, fieldId])) : [fieldId];
  };

  const handleFilterSelect = (fieldId: string, event?: React.MouseEvent | React.KeyboardEvent) => {
    if (!filterConfig) return;
    const allowMulti = Boolean(event && ('ctrlKey' in event) && (event.ctrlKey || event.metaKey));

    onSetBuilderSelectionContextMenu(null);
    if (allowMulti) {
      filterConfig.setSelectedIds((prev) => (
        prev.includes(fieldId) ? prev.filter((item) => item !== fieldId) : [...prev, fieldId]
      ));
      filterConfig.onActivate(fieldId);
      return;
    }

    filterConfig.setSelectedIds([fieldId]);
    filterConfig.onActivate(fieldId);
  };

  const handleFilterContextMenu = (event: React.MouseEvent<HTMLDivElement>, fieldId: string) => {
    if (!filterConfig) return;
    event.preventDefault();
    event.stopPropagation();

    const nextSelectedIds = buildFilterSelectionIds(fieldId, event.ctrlKey || event.metaKey);
    filterConfig.setSelectedIds(nextSelectedIds);
    filterConfig.onActivate(fieldId);
    onSetBuilderSelectionContextMenu({
      kind: 'filter',
      scope: filterConfig.scope,
      x: event.clientX,
      y: event.clientY,
      ids: nextSelectedIds,
    });
  };

  const getFilterNameClass = (isSelected: boolean, isRequired: boolean) => cn(
    'shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[11px] font-medium text-muted-foreground',
    isRequired && 'text-primary',
    isSelected && 'text-foreground',
  );

  const getFilterPreviewShellClass = (isSelected: boolean) => cn(
    'shrink-0 pr-0.5',
    isSelected && '[&>div]:border-border/60 [&>div]:bg-background [&>div]:shadow-none',
  );

  return (
    <div className="shrink-0">
      {!hideFilterBar && (
        <div className="px-1 py-1">
          {filterRuntimeRules ? <style>{filterRuntimeRules}</style> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5 rounded-xl border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground">
                <Filter className="size-3.5" />
                查询条件
              </Badge>
              <span className="text-[11px] font-medium text-muted-foreground">{filterFields.length} 项</span>
            </div>
            {options?.filterAccessory ? (
              <div className="flex shrink-0 items-center gap-2">{options.filterAccessory}</div>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {filterFields.map((field, index) => {
              const normalizedWidth = Math.min(
                metrics.filterResizeMaxWidth,
                Math.max(
                  metrics.filterResizeMinWidth,
                  Number.isFinite(Number(field?.width)) ? Number(field.width) : metrics.filterControlWidth,
                ),
              );
              const normalizedField = {
                required: false,
                ...field,
                width: normalizedWidth,
              };
              const isActive = filterConfig?.selectedId === field.id;
              const isMarkedForDelete = filterConfig?.selectedIds.includes(field.id) ?? false;
              const isSelected = isActive || isMarkedForDelete;
              const widthClassName = createRuntimeClassName('document-filter-width', normalizedField.id);
              const labelClassName = createRuntimeClassName('document-filter-label', normalizedField.id);
              const previewClassName = createRuntimeClassName('document-filter-preview', normalizedField.id);

              return (
                <div
                  key={field.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={(event) => handleFilterSelect(field.id, event)}
                  onContextMenu={(event) => handleFilterContextMenu(event, field.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleFilterSelect(field.id, event);
                    }
                  }}
                  className={cn(
                    widthClassName,
                    'group relative flex h-11 shrink-0 cursor-grab select-none flex-row items-center gap-1 rounded-lg border pl-2 pr-3.5 py-1.5 transition-colors active:cursor-grabbing',
                    isSelected
                      ? 'border-primary/20 bg-background/90'
                      : 'border-transparent bg-transparent hover:border-border/40 hover:bg-background/70',
                  )}
                >
                  <div
                    className={cn(labelClassName, getFilterNameClass(isSelected, Boolean(normalizedField.required)))}
                    title={normalizedField.name}
                  >
                    <span className="block truncate">
                      {normalizedField.name}
                      {normalizedField.required ? <span className="ml-1 text-primary">*</span> : null}
                    </span>
                  </div>
                  <div className={cn(previewClassName, getFilterPreviewShellClass(isSelected))}>
                    {renderFieldPreview(normalizedField, index, 'condition')}
                  </div>
                  <div
                    className="absolute inset-y-2 right-0.5 flex w-1.5 cursor-col-resize items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onMouseDown={(event) => filterConfig && startResize(event, field.id, filterFields, filterConfig.setFields, metrics.filterControlWidth, metrics.filterResizeMaxWidth, 'filter')}
                    onDoubleClick={(event) => filterConfig && autoFitColumnWidth(event, field.id, filterFields, filterConfig.setFields, metrics.filterControlWidth, metrics.filterResizeMaxWidth, 'filter')}
                    title="拖动调整条件宽度，双击可自动适配"
                  >
                    <span className="h-3.5 w-px rounded-full bg-border transition-colors group-hover:bg-primary" />
                  </div>
                </div>
              );
            })}
            {filterConfig && !hideFilterQuickActions ? (
              <Button size="sm" className="h-8 gap-1.5 rounded-xl px-3" onClick={filterConfig.onAdd}>
                <Plus className="size-4" />
                条件
              </Button>
            ) : null}
            {filterConfig && !hideFilterQuickActions ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-xl border-border/60 bg-background/80 px-3"
                onClick={filterConfig.onDelete}
                disabled={filterSelectionCount === 0}
              >
                <Trash2 className="size-4" />
                删除条件{filterSelectionCount > 1 ? ` (${filterSelectionCount})` : ''}
              </Button>
            ) : null}
          </div>
        </div>
      )}
      {!hideActionBar && (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3 px-1 py-1">
          <Button
            variant={tableConfigAction?.active ? 'secondary' : 'ghost'}
            size="sm"
            className="gap-1.5 rounded-xl"
            onClick={tableConfigAction?.onSelect}
          >
            <Table2 className="size-4" />
            {title}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {extraActions}
            <Button size="sm" className="h-8 gap-1.5 rounded-xl px-3" onClick={onAdd}>
              <Plus className="size-4" />
              新增
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl border-border/60 bg-background/80 px-3" onClick={onDelete} disabled={selectedCount === 0}>
              <Trash2 className="size-4" />
              删除
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-xl border-border/60 bg-background/80 px-3">
              <Save className="size-4" />
              保存
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.columns === nextProps.columns
  && prevProps.title === nextProps.title
  && prevProps.selectedCount === nextProps.selectedCount
  && prevProps.extraActions === nextProps.extraActions
  && prevProps.filterConfig?.fields === nextProps.filterConfig?.fields
  && prevProps.filterConfig?.selectedId === nextProps.filterConfig?.selectedId
  && prevProps.filterConfig?.selectedIds === nextProps.filterConfig?.selectedIds
  && prevProps.filterConfig?.scope === nextProps.filterConfig?.scope
  && prevProps.tableConfigAction?.active === nextProps.tableConfigAction?.active
  && prevProps.options?.hideActionBar === nextProps.options?.hideActionBar
  && prevProps.options?.hideFilterBar === nextProps.options?.hideFilterBar
  && prevProps.options?.hideFilterQuickActions === nextProps.options?.hideFilterQuickActions
  && prevProps.options?.filterAccessory === nextProps.options?.filterAccessory
  && prevProps.options?.filterRuntimeRules === nextProps.options?.filterRuntimeRules
  && prevProps.metrics.filterControlWidth === nextProps.metrics.filterControlWidth
  && prevProps.metrics.filterResizeMinWidth === nextProps.metrics.filterResizeMinWidth
  && prevProps.metrics.filterResizeMaxWidth === nextProps.metrics.filterResizeMaxWidth
));
