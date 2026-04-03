import React, { useCallback } from 'react';

type BillCanvasFieldScope = 'main' | 'meta';

type UseBillHeaderWorkbenchParams = {
  billHeaderCanvasRef: React.RefObject<HTMLDivElement | null>;
  billHeaderWorkbenchRows: number;
  billMetaFields: any[];
  mainTableColumns: any[];
  setBillHeaderWorkbenchConfig: React.Dispatch<React.SetStateAction<{ rows: number }>>;
  setBillMetaFields: React.Dispatch<React.SetStateAction<any[]>>;
  setMainTableColumns: React.Dispatch<React.SetStateAction<any[]>>;
  clampValue: (value: number, min: number, max: number) => number;
  normalizeColumn: (column: any) => any;
  constants: {
    defaultWidth: number;
    gapX: number;
    gapY: number;
    layoutPaddingX: number;
    layoutPaddingY: number;
    maxRows: number;
    maxWidth: number;
    minRows: number;
    minWidth: number;
    rowHeight: number;
  };
};

export function useBillHeaderWorkbench({
  billHeaderCanvasRef,
  billHeaderWorkbenchRows,
  billMetaFields,
  mainTableColumns,
  setBillHeaderWorkbenchConfig,
  setBillMetaFields,
  setMainTableColumns,
  clampValue,
  normalizeColumn,
  constants,
}: UseBillHeaderWorkbenchParams) {
  const getBillHeaderDragItemId = useCallback((fieldId: string, scope: BillCanvasFieldScope) => (
    `bill-header-item:${scope}:${fieldId}`
  ), []);

  const getBillHeaderDropItemId = useCallback((fieldId: string, scope: BillCanvasFieldScope) => (
    `bill-header-drop:${scope}:${fieldId}`
  ), []);

  const getBillHeaderRowDropId = useCallback((row: number) => `bill-header-row:${row}`, []);

  const getBillHeaderLegacyRow = useCallback((field: any) => {
    const legacyY = Number.isFinite(Number(field?.canvasY))
      ? Number(field.canvasY)
      : constants.layoutPaddingY;
    return Math.floor(
      Math.max(0, legacyY - constants.layoutPaddingY) / (constants.rowHeight + constants.gapY),
    ) + 1;
  }, [constants.gapY, constants.layoutPaddingY, constants.rowHeight]);

  const getBillHeaderLegacyMetrics = useCallback((field: any) => ({
    x: Number.isFinite(Number(field?.canvasX)) ? Number(field.canvasX) : constants.layoutPaddingX,
    y: Number.isFinite(Number(field?.canvasY)) ? Number(field.canvasY) : constants.layoutPaddingY,
    row: getBillHeaderLegacyRow(field),
  }), [constants.layoutPaddingX, constants.layoutPaddingY, getBillHeaderLegacyRow]);

  const getBillHeaderRowCount = useCallback(() => clampValue(
    Number.isFinite(Number(billHeaderWorkbenchRows)) ? Number(billHeaderWorkbenchRows) : 3,
    constants.minRows,
    constants.maxRows,
  ), [billHeaderWorkbenchRows, clampValue, constants.maxRows, constants.minRows]);

  const getOrderedBillHeaderFields = useCallback((
    metaFields = billMetaFields,
    mainFields = mainTableColumns,
    rowCount = getBillHeaderRowCount(),
  ) => {
    const scopedFields = [
      ...metaFields.map((field) => ({ ...field, __scope: 'meta' as BillCanvasFieldScope })),
      ...mainFields.map((field) => ({ ...field, __scope: 'main' as BillCanvasFieldScope })),
    ];
    const legacySorted = scopedFields
      .slice()
      .sort((left, right) => {
        const leftMetrics = getBillHeaderLegacyMetrics(left);
        const rightMetrics = getBillHeaderLegacyMetrics(right);
        if (leftMetrics.row !== rightMetrics.row) return leftMetrics.row - rightMetrics.row;
        if (leftMetrics.y !== rightMetrics.y) return leftMetrics.y - rightMetrics.y;
        return leftMetrics.x - rightMetrics.x;
      });
    const legacyOrderMap = new Map(legacySorted.map((field, index) => [field.id, index + 1]));

    return scopedFields
      .map((field) => {
        const normalized = normalizeColumn(field);
        return {
          ...normalized,
          __scope: field.__scope,
          width: Math.max(constants.minWidth, Math.min(constants.maxWidth, normalized.width || constants.defaultWidth)),
          panelRow: clampValue(
            Number.isFinite(Number(normalized.panelRow))
              ? Number(normalized.panelRow)
              : getBillHeaderLegacyMetrics(normalized).row,
            constants.minRows,
            rowCount,
          ),
          panelOrder: Number.isFinite(Number(normalized.panelOrder))
            ? Number(normalized.panelOrder)
            : (legacyOrderMap.get(field.id) ?? 1),
        };
      })
      .sort((left, right) => {
        if (left.panelRow !== right.panelRow) return left.panelRow - right.panelRow;
        if (left.panelOrder !== right.panelOrder) return left.panelOrder - right.panelOrder;
        return (legacyOrderMap.get(left.id) ?? 0) - (legacyOrderMap.get(right.id) ?? 0);
      });
  }, [
    billMetaFields,
    clampValue,
    constants.defaultWidth,
    constants.maxWidth,
    constants.minRows,
    constants.minWidth,
    getBillHeaderLegacyMetrics,
    getBillHeaderRowCount,
    mainTableColumns,
    normalizeColumn,
  ]);

  const commitBillHeaderFields = useCallback((
    updater: any[] | ((fields: any[]) => any[]),
    rowCount = getBillHeaderRowCount(),
  ) => {
    const metaIdSet = new Set(billMetaFields.map((field) => field.id));
    const currentFields = getOrderedBillHeaderFields(billMetaFields, mainTableColumns, rowCount)
      .map(({ ...field }) => ({ ...field }));
    const nextRaw = typeof updater === 'function' ? updater(currentFields) : updater;
    const nextFields = nextRaw.map((field, index) => {
      const normalized = normalizeColumn(field);
      return {
        ...normalized,
        width: Math.max(constants.minWidth, Math.min(constants.maxWidth, normalized.width || constants.defaultWidth)),
        panelRow: clampValue(
          Number.isFinite(Number(normalized.panelRow))
            ? Number(normalized.panelRow)
            : getBillHeaderLegacyMetrics(normalized).row,
          constants.minRows,
          rowCount,
        ),
        panelOrder: index + 1,
      };
    });
    setBillMetaFields(nextFields.filter((field) => metaIdSet.has(field.id)));
    setMainTableColumns(nextFields.filter((field) => !metaIdSet.has(field.id)));
  }, [
    billMetaFields,
    clampValue,
    constants.defaultWidth,
    constants.maxWidth,
    constants.minRows,
    constants.minWidth,
    getBillHeaderLegacyMetrics,
    getBillHeaderRowCount,
    getOrderedBillHeaderFields,
    mainTableColumns,
    normalizeColumn,
    setBillMetaFields,
    setMainTableColumns,
  ]);

  const updateBillHeaderWorkbenchRows = useCallback((nextRows: number) => {
    const clampedRows = clampValue(nextRows, constants.minRows, constants.maxRows);
    setBillHeaderWorkbenchConfig((prev) => (
      prev.rows === clampedRows ? prev : { ...prev, rows: clampedRows }
    ));
    commitBillHeaderFields(
      (fields) => fields.map((field) => ({
        ...field,
        panelRow: clampValue(
          Number.isFinite(Number(field?.panelRow)) ? Number(field.panelRow) : constants.minRows,
          constants.minRows,
          clampedRows,
        ),
      })),
      clampedRows,
    );
  }, [clampValue, commitBillHeaderFields, constants.maxRows, constants.minRows, setBillHeaderWorkbenchConfig]);

  const moveBillHeaderField = useCallback((fieldId: string, rowNumber: number, beforeId: string | null = null) => {
    const rowCount = getBillHeaderRowCount();
    const nextRow = clampValue(rowNumber, constants.minRows, rowCount);
    commitBillHeaderFields((fields) => {
      const sourceIndex = fields.findIndex((field) => field.id === fieldId);
      if (sourceIndex === -1) return fields;
      if (beforeId && beforeId === fieldId) return fields;

      const sourceField = {
        ...fields[sourceIndex],
        panelRow: nextRow,
      };
      const remaining = fields.filter((field) => field.id !== fieldId);

      let insertIndex = beforeId ? remaining.findIndex((field) => field.id === beforeId) : -1;
      if (insertIndex === -1) {
        insertIndex = remaining.findIndex((field) => (
          clampValue(
            Number.isFinite(Number(field?.panelRow)) ? Number(field.panelRow) : constants.minRows,
            constants.minRows,
            rowCount,
          ) > nextRow
        ));
        if (insertIndex === -1) {
          insertIndex = remaining.length;
        }
      }

      return [
        ...remaining.slice(0, insertIndex),
        sourceField,
        ...remaining.slice(insertIndex),
      ];
    }, rowCount);
  }, [clampValue, commitBillHeaderFields, constants.minRows, getBillHeaderRowCount]);

  const autoArrangeBillHeaderFields = useCallback(() => {
    const boardWidth = billHeaderCanvasRef.current?.clientWidth ?? 1080;
    const usableWidth = Math.max(760, boardWidth - 40);
    const rowCount = getBillHeaderRowCount();
    let currentRow = 1;
    let currentRowWidth = 0;

    commitBillHeaderFields((fields) => (
      fields.map((field) => {
        const normalizedField = normalizeColumn(field);
        const nextWidth = Math.max(constants.minWidth, normalizedField.width || constants.defaultWidth);

        if (
          currentRowWidth > 0
          && currentRowWidth + nextWidth > usableWidth
          && currentRow < rowCount
        ) {
          currentRow += 1;
          currentRowWidth = 0;
        }

        currentRowWidth += nextWidth + constants.gapX;
        return {
          ...field,
          panelRow: currentRow,
        };
      })
    ), rowCount);
  }, [
    billHeaderCanvasRef,
    commitBillHeaderFields,
    constants.defaultWidth,
    constants.gapX,
    constants.minWidth,
    getBillHeaderRowCount,
    normalizeColumn,
  ]);

  return {
    autoArrangeBillHeaderFields,
    commitBillHeaderFields,
    getBillHeaderDragItemId,
    getBillHeaderDropItemId,
    getBillHeaderRowCount,
    getBillHeaderRowDropId,
    getOrderedBillHeaderFields,
    moveBillHeaderField,
    updateBillHeaderWorkbenchRows,
  };
}
