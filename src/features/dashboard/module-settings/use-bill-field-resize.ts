import React, { useCallback, useEffect, useRef, useState } from 'react';

type BillCanvasFieldScope = 'main' | 'meta';

type UseBillFieldResizeParams = {
  billHeaderCanvasRef: React.RefObject<HTMLDivElement | null>;
  billHeaderWorkbenchRows: number;
  billMetaFields: any[];
  mainTableColumns: any[];
  setBillMetaFields: React.Dispatch<React.SetStateAction<any[]>>;
  setMainTableColumns: React.Dispatch<React.SetStateAction<any[]>>;
  clampValue: (value: number, min: number, max: number) => number;
  normalizeColumn: (column: any) => any;
  buildResizeSnapCandidates: (
    siblingWidths: number[],
    options: {
      minWidth: number;
      maxWidth: number;
      baseWidth: number;
    },
  ) => number[];
  resolveResizeWidthWithSnap: (
    rawWidth: number,
    options: {
      minWidth: number;
      maxWidth: number;
      snapCandidates: number[];
    },
  ) => {
    width: number;
  };
  constants: {
    defaultWidth: number;
    layoutPaddingX: number;
    maxRows: number;
    maxWidth: number;
    minRows: number;
    minWidth: number;
  };
};

export function useBillFieldResize({
  billHeaderCanvasRef,
  billHeaderWorkbenchRows,
  billMetaFields,
  mainTableColumns,
  setBillMetaFields,
  setMainTableColumns,
  clampValue,
  normalizeColumn,
  buildResizeSnapCandidates,
  resolveResizeWidthWithSnap,
  constants,
}: UseBillFieldResizeParams) {
  const [activeBillResizeId, setActiveBillResizeId] = useState<string | null>(null);
  const [billFieldLivePreview, setBillFieldLivePreview] = useState<{
    id: string;
    scope: BillCanvasFieldScope;
    width?: number;
  } | null>(null);
  const billFieldResizeRef = useRef<{
    id: string;
    scope: BillCanvasFieldScope;
    startX: number;
    startWidth: number;
    startCanvasX: number;
    boardWidth: number;
  } | null>(null);
  const billCanvasFieldsRef = useRef<any[]>([...mainTableColumns, ...billMetaFields]);
  const billResizeFrameRef = useRef<number | null>(null);
  const pendingBillResizeRef = useRef<{
    id: string;
    scope: BillCanvasFieldScope;
    width: number;
  } | null>(null);

  const resetBillFieldResize = useCallback(() => {
    if (billResizeFrameRef.current !== null) {
      window.cancelAnimationFrame(billResizeFrameRef.current);
      billResizeFrameRef.current = null;
    }
    pendingBillResizeRef.current = null;
    setBillFieldLivePreview(null);
    setActiveBillResizeId(null);
    billFieldResizeRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const startBillFieldResize = useCallback((
    event: React.MouseEvent<HTMLDivElement>,
    columnId: string,
    scope: BillCanvasFieldScope = 'main',
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const canvasRect = billHeaderCanvasRef.current?.getBoundingClientRect();
    const targetColumn = (scope === 'main' ? mainTableColumns : billMetaFields).find((column) => column.id === columnId);
    if (!canvasRect || !targetColumn) return;

    const normalizedColumn = normalizeColumn(targetColumn);
    const nextWidth = Math.max(constants.minWidth, normalizedColumn.width || constants.defaultWidth);
    billFieldResizeRef.current = {
      id: columnId,
      scope,
      startX: event.clientX,
      startWidth: nextWidth,
      startCanvasX: 0,
      boardWidth: canvasRect.width,
    };
    setBillFieldLivePreview({
      id: columnId,
      scope,
      width: nextWidth,
    });
    setActiveBillResizeId(columnId);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [
    billHeaderCanvasRef,
    billMetaFields,
    constants.defaultWidth,
    constants.minWidth,
    mainTableColumns,
    normalizeColumn,
  ]);

  useEffect(() => {
    billCanvasFieldsRef.current = [...mainTableColumns, ...billMetaFields];
  }, [mainTableColumns, billMetaFields]);

  useEffect(() => {
    const activeResizeId = billFieldResizeRef.current?.id ?? activeBillResizeId;
    if (!activeResizeId) {
      return;
    }

    const hasActiveField = billCanvasFieldsRef.current.some((column) => column.id === activeResizeId);
    if (hasActiveField) {
      return;
    }

    const cleanupId = window.setTimeout(() => {
      resetBillFieldResize();
    }, 0);

    return () => {
      window.clearTimeout(cleanupId);
    };
  }, [activeBillResizeId, billMetaFields, mainTableColumns, resetBillFieldResize]);

  useEffect(() => {
    const handlePointerMove = (event: MouseEvent) => {
      if (!billFieldResizeRef.current) return;

      const resize = billFieldResizeRef.current;
      const maxWidth = Math.max(
        constants.minWidth,
        Math.min(constants.maxWidth, resize.boardWidth - resize.startCanvasX - constants.layoutPaddingX),
      );
      const resizeField = billCanvasFieldsRef.current.find((column) => column.id === resize.id);
      const resizeRow = clampValue(
        Number.isFinite(Number(resizeField?.panelRow)) ? Number(resizeField.panelRow) : constants.minRows,
        constants.minRows,
        billHeaderWorkbenchRows,
      );
      const siblingWidths = billCanvasFieldsRef.current
        .filter((column) => column.id !== resize.id)
        .filter((column) => (
          clampValue(
            Number.isFinite(Number(column?.panelRow)) ? Number(column.panelRow) : constants.minRows,
            constants.minRows,
            billHeaderWorkbenchRows,
          ) === resizeRow
        ))
        .map((column) => Math.max(constants.minWidth, Number(column?.width) || constants.defaultWidth));
      const snapCandidates = buildResizeSnapCandidates(siblingWidths, {
        minWidth: constants.minWidth,
        maxWidth,
        baseWidth: constants.defaultWidth,
      });
      const rawWidth = resize.startWidth + (event.clientX - resize.startX);
      const { width: nextWidth } = resolveResizeWidthWithSnap(rawWidth, {
        minWidth: constants.minWidth,
        maxWidth,
        snapCandidates,
      });

      pendingBillResizeRef.current = {
        id: resize.id,
        scope: resize.scope,
        width: nextWidth,
      };

      if (billResizeFrameRef.current !== null) return;
      billResizeFrameRef.current = window.requestAnimationFrame(() => {
        billResizeFrameRef.current = null;
        const nextResize = pendingBillResizeRef.current;
        if (!nextResize) return;

        setBillFieldLivePreview((prev) => (
          prev
          && prev.id === nextResize.id
          && prev.scope === nextResize.scope
          && prev.width === nextResize.width
            ? prev
            : {
                id: nextResize.id,
                scope: nextResize.scope,
                width: nextResize.width,
              }
        ));
      });
    };

    const stopResize = () => {
      if (!billFieldResizeRef.current) return;

      if (billResizeFrameRef.current !== null) {
        window.cancelAnimationFrame(billResizeFrameRef.current);
        billResizeFrameRef.current = null;
      }
      const nextResize = pendingBillResizeRef.current;
      if (nextResize) {
        const updateFields = nextResize.scope === 'main' ? setMainTableColumns : setBillMetaFields;
        updateFields((prev: any[]) => prev.map((column) => (
          column.id === nextResize.id
            ? { ...column, width: nextResize.width }
            : column
        )));
      }

      resetBillFieldResize();
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', stopResize);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [
    billHeaderWorkbenchRows,
    buildResizeSnapCandidates,
    clampValue,
    constants.defaultWidth,
    constants.layoutPaddingX,
    constants.maxWidth,
    constants.minRows,
    constants.minWidth,
    resetBillFieldResize,
    resolveResizeWidthWithSnap,
    setBillMetaFields,
    setMainTableColumns,
  ]);

  return {
    activeBillResizeId,
    billFieldLivePreview,
    startBillFieldResize,
  };
}
