import React, { useEffect, useRef, useState } from 'react';

type UseBillDocumentLayoutParams = {
  autoArrangeBillHeaderFields: () => void;
  billDetailColumnCount: number;
  billDocumentPaperRef: React.RefObject<HTMLDivElement | null>;
  billDocumentViewportRef: React.RefObject<HTMLDivElement | null>;
  billMetaFields: any[];
  businessType: string;
  isModuleSettingFullscreen: boolean;
  mainTableColumns: any[];
  normalizeColumn: (column: any) => any;
  getBillFieldLayout: (index: number, width?: number) => { canvasX: number; canvasY: number };
  constants: {
    defaultWidth: number;
    minWidth: number;
  };
};

export function useBillDocumentLayout({
  autoArrangeBillHeaderFields,
  billDetailColumnCount,
  billDocumentPaperRef,
  billDocumentViewportRef,
  billMetaFields,
  businessType,
  isModuleSettingFullscreen,
  mainTableColumns,
  normalizeColumn,
  getBillFieldLayout,
  constants,
}: UseBillDocumentLayoutParams) {
  const [billDocumentScale, setBillDocumentScale] = useState(1);
  const billHeaderAutoFillRef = useRef(false);

  useEffect(() => {
    if (businessType !== 'table') return;

    const viewport = billDocumentViewportRef.current;
    const paper = billDocumentPaperRef.current;
    if (!viewport || !paper || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const viewportPadding = isModuleSettingFullscreen ? 4 : 16;
      const viewportWidth = viewport.clientWidth - viewportPadding;
      const viewportHeight = viewport.clientHeight - viewportPadding;
      const paperWidth = paper.scrollWidth || 1480;
      const paperHeight = paper.scrollHeight || 920;

      if (viewportWidth <= 0 || viewportHeight <= 0 || paperWidth <= 0 || paperHeight <= 0) return;

      const scaleLimit = isModuleSettingFullscreen ? 1.08 : 1;
      const nextScale = Math.min(scaleLimit, viewportWidth / paperWidth, viewportHeight / paperHeight);
      setBillDocumentScale((prev) => (Math.abs(prev - nextScale) < 0.01 ? prev : nextScale));
    };

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(measure);
    });
    observer.observe(viewport);
    observer.observe(paper);
    window.requestAnimationFrame(measure);

    return () => observer.disconnect();
  }, [
    billDetailColumnCount,
    billDocumentPaperRef,
    billDocumentViewportRef,
    billMetaFields.length,
    businessType,
    isModuleSettingFullscreen,
    mainTableColumns.length,
  ]);

  useEffect(() => {
    if (businessType !== 'table' || isModuleSettingFullscreen || billHeaderAutoFillRef.current) return;
    if (mainTableColumns.length === 0) return;

    const mainLayoutMatches = mainTableColumns.every((field, index) => {
      const normalizedField = normalizeColumn(field);
      const width = Math.max(constants.minWidth, normalizedField.width || constants.defaultWidth);
      const expectedLayout = getBillFieldLayout(index, width);
      return Math.abs((normalizedField.canvasX ?? expectedLayout.canvasX) - expectedLayout.canvasX) <= 4
        && Math.abs((normalizedField.canvasY ?? expectedLayout.canvasY) - expectedLayout.canvasY) <= 4;
    });
    const legacyMetaLayout = [
      { id: 'bill_meta_date', x: 540, y: 100 },
      { id: 'bill_meta_operator', x: 540, y: 160 },
      { id: 'bill_meta_operate_time', x: 540, y: 220 },
    ];
    const metaLayoutMatches = billMetaFields.every((field, index) => {
      const expectedLayout = legacyMetaLayout[index];
      return Boolean(expectedLayout)
        && field.id === expectedLayout.id
        && Math.abs((field.canvasX ?? expectedLayout.x) - expectedLayout.x) <= 4
        && Math.abs((field.canvasY ?? expectedLayout.y) - expectedLayout.y) <= 4;
    });

    if (!mainLayoutMatches || !metaLayoutMatches) {
      billHeaderAutoFillRef.current = true;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      billHeaderAutoFillRef.current = true;
      autoArrangeBillHeaderFields();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    autoArrangeBillHeaderFields,
    billMetaFields,
    businessType,
    constants.defaultWidth,
    constants.minWidth,
    getBillFieldLayout,
    isModuleSettingFullscreen,
    mainTableColumns,
    normalizeColumn,
  ]);

  return {
    billDocumentScale,
  };
}
