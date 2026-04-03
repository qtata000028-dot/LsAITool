export const BILL_FORM_DEFAULT_WIDTH = 236;
export const BILL_FORM_MIN_WIDTH = 168;
export const BILL_FORM_MAX_WIDTH = 560;
export const BILL_FORM_DEFAULT_LABEL_WIDTH = 72;
export const BILL_FORM_DEFAULT_FONT_SIZE = 12;
export const BILL_FORM_LAYOUT_PADDING_X = 28;
export const BILL_FORM_LAYOUT_PADDING_Y = 28;
export const BILL_FORM_LAYOUT_GAP_X = 24;
export const BILL_FORM_LAYOUT_GAP_Y = 18;
export const BILL_FORM_LAYOUT_COLUMNS = 3;
export const BILL_FORM_ROW_HEIGHT = 56;

export function getBillFieldLayout(index: number, width = BILL_FORM_DEFAULT_WIDTH) {
  const columnIndex = index % BILL_FORM_LAYOUT_COLUMNS;
  const rowIndex = Math.floor(index / BILL_FORM_LAYOUT_COLUMNS);
  return {
    canvasX: BILL_FORM_LAYOUT_PADDING_X + columnIndex * (width + BILL_FORM_LAYOUT_GAP_X),
    canvasY: BILL_FORM_LAYOUT_PADDING_Y + rowIndex * (BILL_FORM_ROW_HEIGHT + BILL_FORM_LAYOUT_GAP_Y),
    labelWidth: BILL_FORM_DEFAULT_LABEL_WIDTH,
    fontSize: BILL_FORM_DEFAULT_FONT_SIZE,
    sourceTable: 'bill-source',
    sourceField: '',
  };
}
