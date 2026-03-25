import React, { useCallback, useMemo } from 'react';

import type { TableBuilderOptions } from './table-builder';

type DetailTableColumnsState = Record<string, any[]>;
type DetailTableConfigsState = Record<string, any>;

export type UseDashboardTableBuilderOptionsParams = {
  activeTab: string;
  activateTableConfigSelection: (scope: 'left' | 'main' | 'detail', id?: string) => void;
  detailTableColumns: DetailTableColumnsState;
  detailTableConfigs: DetailTableConfigsState;
  inspectorTargetId: string;
  mainDetailBoardEnabled: boolean;
  mainDetailBoardGroupsLength: number;
  mainRenderableColumns: any[];
  mainTableConfig: {
    contextMenuItems?: any[];
    detailBoard?: any;
  };
  normalizedMainDetailBoardConfig: any;
  openDetailBoardPreview: (tabIndex: number) => void;
  selectedTableConfigScope: string | null;
  setDetailTableColumns: React.Dispatch<React.SetStateAction<DetailTableColumnsState>>;
  setSelectedArchiveNodeId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useDashboardTableBuilderOptions({
  activeTab,
  activateTableConfigSelection,
  detailTableColumns,
  detailTableConfigs,
  inspectorTargetId,
  mainDetailBoardEnabled,
  mainDetailBoardGroupsLength,
  mainRenderableColumns,
  mainTableConfig,
  normalizedMainDetailBoardConfig,
  openDetailBoardPreview,
  selectedTableConfigScope,
  setDetailTableColumns,
  setSelectedArchiveNodeId,
}: UseDashboardTableBuilderOptionsParams) {
  const activeDetailTableColumns = detailTableColumns[activeTab] || [];
  const activeDetailTableConfig = detailTableConfigs[activeTab];
  const isDetailGridTableSelected = selectedTableConfigScope === 'detail' && inspectorTargetId === '表格';

  const setActiveDetailTableColumns = useCallback((newCols: React.SetStateAction<any[]>) => {
    setDetailTableColumns((prev) => ({
      ...prev,
      [activeTab]: typeof newCols === 'function' ? newCols(prev[activeTab] || []) : newCols,
    }));
  }, [activeTab, setDetailTableColumns]);

  const handleArchiveMainTableSelect = useCallback(() => {
    setSelectedArchiveNodeId('archive-main');
    activateTableConfigSelection('main');
  }, [activateTableConfigSelection, setSelectedArchiveNodeId]);

  const handleArchiveMainTablePreview = useCallback(() => {
    if (mainDetailBoardGroupsLength === 0) return;
    openDetailBoardPreview(1);
  }, [mainDetailBoardGroupsLength, openDetailBoardPreview]);

  const handleArchiveLeftTableSelect = useCallback(() => {
    setSelectedArchiveNodeId('archive-left-grid');
    activateTableConfigSelection('left');
  }, [activateTableConfigSelection, setSelectedArchiveNodeId]);

  const handleBuilderMainTableSelect = useCallback(() => {
    activateTableConfigSelection('main');
  }, [activateTableConfigSelection]);

  const handleBuilderMainTablePreview = useCallback(() => {
    if (!mainDetailBoardEnabled) return;
    openDetailBoardPreview(1);
  }, [mainDetailBoardEnabled, openDetailBoardPreview]);

  const handleActiveDetailTableSelect = useCallback(() => {
    setSelectedArchiveNodeId(`detail-${activeTab}`);
    activateTableConfigSelection('detail', '表格');
  }, [activeTab, activateTableConfigSelection, setSelectedArchiveNodeId]);

  const handleBillDetailTableSelect = useCallback(() => {
    activateTableConfigSelection('detail');
  }, [activateTableConfigSelection]);

  const archiveMainTableBuilderOptions = useMemo<TableBuilderOptions>(() => ({
    contextMenuScope: 'main',
    contextMenuConfig: {
      enabled: (mainTableConfig.contextMenuItems ?? []).length > 0,
      items: mainTableConfig.contextMenuItems ?? [],
    },
    backgroundSelectable: true,
    tableSelected: selectedTableConfigScope === 'main',
    onSelectTable: handleArchiveMainTableSelect,
    detailBoardConfig: mainTableConfig.detailBoard,
    normalizedDetailBoardConfig: normalizedMainDetailBoardConfig,
    renderableColumns: mainRenderableColumns,
    onCanvasDoubleClick: handleArchiveMainTablePreview,
    canvasLabel: '点击配置基础档案主表',
  }), [
    handleArchiveMainTablePreview,
    handleArchiveMainTableSelect,
    mainRenderableColumns,
    mainTableConfig.contextMenuItems,
    mainTableConfig.detailBoard,
    normalizedMainDetailBoardConfig,
    selectedTableConfigScope,
  ]);

  const documentTreeTableBuilderOptions = useMemo<TableBuilderOptions>(() => ({
    backgroundSelectable: true,
    tableSelected: selectedTableConfigScope === 'left',
    onSelectTable: handleArchiveLeftTableSelect,
    canvasLabel: '点击配置左侧树表',
  }), [handleArchiveLeftTableSelect, selectedTableConfigScope]);

  const builderMainTableBuilderOptions = useMemo<TableBuilderOptions>(() => ({
    backgroundSelectable: true,
    tableSelected: selectedTableConfigScope === 'main',
    onSelectTable: handleBuilderMainTableSelect,
    detailBoardConfig: mainTableConfig.detailBoard,
    normalizedDetailBoardConfig: normalizedMainDetailBoardConfig,
    renderableColumns: mainRenderableColumns,
    onCanvasDoubleClick: handleBuilderMainTablePreview,
    canvasLabel: '点击配置主表属性',
  }), [
    handleBuilderMainTablePreview,
    handleBuilderMainTableSelect,
    mainRenderableColumns,
    mainTableConfig.detailBoard,
    normalizedMainDetailBoardConfig,
    selectedTableConfigScope,
  ]);

  const documentDetailTableBuilderOptions = useMemo<TableBuilderOptions>(() => ({
    contextMenuScope: 'detail',
    contextMenuConfig: {
      enabled: Boolean(activeDetailTableConfig?.contextMenuEnabled),
      items: activeDetailTableConfig?.contextMenuItems ?? [],
    },
    backgroundSelectable: true,
    tableSelected: isDetailGridTableSelected,
    onSelectTable: handleActiveDetailTableSelect,
    detailBoardConfig: activeDetailTableConfig?.detailBoard,
    canvasLabel: '点击配置明细表属性',
    density: 'compact',
  }), [
    activeDetailTableConfig?.contextMenuEnabled,
    activeDetailTableConfig?.contextMenuItems,
    activeDetailTableConfig?.detailBoard,
    handleActiveDetailTableSelect,
    isDetailGridTableSelected,
  ]);

  const billDetailTableBuilderOptions = useMemo<TableBuilderOptions>(() => ({
    backgroundSelectable: true,
    tableSelected: selectedTableConfigScope === 'detail',
    onSelectTable: handleBillDetailTableSelect,
    canvasLabel: '点击配置单据明细表',
  }), [handleBillDetailTableSelect, selectedTableConfigScope]);

  return {
    activeDetailTableColumns,
    setActiveDetailTableColumns,
    archiveMainTableBuilderOptions,
    documentTreeTableBuilderOptions,
    builderMainTableBuilderOptions,
    documentDetailTableBuilderOptions,
    billDetailTableBuilderOptions,
  };
}
