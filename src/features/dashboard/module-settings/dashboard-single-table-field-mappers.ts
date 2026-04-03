import type { SingleTableGridFieldDto, SingleTableModuleFieldDto } from '../../../lib/backend-module-config';
import {
  FIELD_TYPE_OPTIONS,
  getRecordFieldValue,
  mapFieldSqlTagToFieldType,
  normalizeFieldSqlTagId,
  toDetailGridFieldVisible,
  toRecordBoolean,
  toRecordNumber,
  toRecordText,
} from './dashboard-field-type-utils';
import { BILL_FORM_DEFAULT_WIDTH, getBillFieldLayout } from './dashboard-bill-form-layout-utils';

function buildSingleTableFieldColumn(index: number, overrides: Record<string, unknown> = {}) {
  return {
    ...getBillFieldLayout(index, BILL_FORM_DEFAULT_WIDTH),
    required: false,
    visible: true,
    searchable: false,
    readonly: false,
    align: '左对齐',
    placeholder: '',
    defaultValue: '',
    dictCode: '',
    formula: '',
    relationSql: '',
    dynamicSql: '',
    helpText: '',
    ...overrides,
  };
}

function resolveSingleTableFieldType(field: Record<string, unknown>) {
  const directType = toRecordText(
    getRecordFieldValue(field, 'type', 'fieldType', 'fieldtypename', 'fieldTypeName', 'controltypename', 'controlTypeName'),
  );

  if (FIELD_TYPE_OPTIONS.includes(directType)) {
    return directType;
  }

  const fieldSqlTagLabel = toRecordText(getRecordFieldValue(field, 'fieldsqltagname', 'fieldSqlTagName', 'showname', 'showName'));
  const fieldSqlTagValue = getRecordFieldValue(field, 'fieldsqltag', 'fieldSqlTag', 'controltype', 'controlType');
  const mappedByFieldSqlTag = mapFieldSqlTagToFieldType(fieldSqlTagValue, fieldSqlTagLabel, directType || '文本');
  if (FIELD_TYPE_OPTIONS.includes(mappedByFieldSqlTag)) {
    return mappedByFieldSqlTag;
  }

  if (/(日期|时间|date|time)/i.test(directType)) {
    return '日期框';
  }

  if (/下拉|select/i.test(directType)) {
    return '下拉框';
  }

  if (/搜索|lookup|search/i.test(directType)) {
    return '搜索框';
  }

  if (/radio/i.test(directType)) {
    return '单选框';
  }

  if (/checkbox|multi/i.test(directType)) {
    return '多选框';
  }

  const fieldName = toRecordText(getRecordFieldValue(field, 'username1', 'displayName', 'fieldname', 'fieldName'));
  const systemName = toRecordText(getRecordFieldValue(field, 'sysname', 'systemName'));
  const nameForGuess = `${fieldName} ${systemName}`;

  if (/(日期|时间|date|time)/i.test(nameForGuess)) {
    return '日期框';
  }

  if (/(数量|金额|单价|price|amount|qty|count|number)/i.test(nameForGuess)) {
    return '数字';
  }

  return '文本';
}

export function mapSingleTableFieldRecordToColumn(field: SingleTableModuleFieldDto, index: number) {
  const backendId = getRecordFieldValue(field, 'id');
  const displayName = toRecordText(getRecordFieldValue(field, 'username1', 'displayName'));
  const fieldName = toRecordText(getRecordFieldValue(field, 'fieldname', 'fieldName'));
  const systemName = toRecordText(getRecordFieldValue(field, 'sysname', 'systemName'));
  const fieldKey = toRecordText(getRecordFieldValue(field, 'fieldkey', 'fieldKey'));
  const placeholder = toRecordText(getRecordFieldValue(field, 'InputHintText', 'inputhinttext', 'placeholder', 'prompttext', 'promptText'));
  const relationSql = toRecordText(getRecordFieldValue(field, 'relationsql', 'relationSql'));
  const dynamicSql = toRecordText(getRecordFieldValue(field, 'fieldsql', 'fieldSql', 'dynamicsql', 'dynamicSql'));
  const helpText = toRecordText(getRecordFieldValue(field, 'bak', 'helptext', 'helpText', 'remark', 'memo'));
  const defaultValue = toRecordText(getRecordFieldValue(field, 'defaultdate', 'defaultDate', 'defaultvalue', 'defaultValue'));
  const fieldSqlTag = normalizeFieldSqlTagId(getRecordFieldValue(field, 'fieldsqltag', 'fieldSqlTag'), 0);
  const fieldSqlTagName = toRecordText(getRecordFieldValue(field, 'fieldsqltagname', 'fieldSqlTagName', 'showname', 'showName'));
  const alignValue = toRecordText(getRecordFieldValue(field, 'dataAlign', 'dataalign', 'align'));
  const hiddenValue = getRecordFieldValue(field, 'vislble', 'vislble');
  const visibleAliasValue = getRecordFieldValue(field, 'visible', 'isVisible', 'showmobile', 'showMobile');
  const requiredValue = getRecordFieldValue(field, 'tagid', 'required', 'isneed', 'isNeed', 'mustinput', 'mustInput');
  const readonlyValue = getRecordFieldValue(field, 'edit', 'readonly', 'readOnly', 'isreadonly', 'isReadOnly');
  const searchableValue = getRecordFieldValue(field, 'ifSearch', 'ifsearch', 'searchable', 'isquery', 'isQuery', 'queryable');

  return buildSingleTableFieldColumn(index, {
    ...field,
    id: backendId == null ? `field_${Date.now()}_${index + 1}` : `field_${backendId}`,
    backendId,
    orderId: toRecordNumber(getRecordFieldValue(field, 'orderid', 'orderId'), index + 1),
    backendFieldKey: fieldKey,
    formKey: toRecordText(getRecordFieldValue(field, 'formkey', 'formKey')),
    tab: toRecordText(getRecordFieldValue(field, 'tab')),
    fieldSqlTag,
    fieldSqlTagName,
    name: displayName || fieldName || systemName || fieldKey || `字段 ${index + 1}`,
    sourceField: fieldName,
    type: resolveSingleTableFieldType(field),
    width: toRecordNumber(
      getRecordFieldValue(field, 'width', 'controlwidth', 'controlWidth', 'mobilewidth', 'mobileWidth'),
      BILL_FORM_DEFAULT_WIDTH,
    ),
    required: toRecordBoolean(requiredValue, false),
    visible: hiddenValue == null ? toRecordBoolean(visibleAliasValue, true) : !toRecordBoolean(hiddenValue, false),
    searchable: toRecordBoolean(searchableValue, false),
    readonly: toRecordBoolean(readonlyValue, false),
    align: alignValue || '左对齐',
    placeholder,
    defaultValue,
    dictCode: toRecordText(getRecordFieldValue(field, 'fieldsqlid', 'fieldSqlId', 'dictcode', 'dictCode')),
    formula: toRecordText(getRecordFieldValue(field, 'calcExpr', 'calcexpr', 'formula')),
    relationSql,
    dynamicSql,
    helpText,
  });
}

export function mapSingleTableDetailGridFieldToColumn(field: SingleTableGridFieldDto, index: number) {
  const mappedColumn = mapSingleTableFieldRecordToColumn(field, index) as Record<string, any>;
  const rest = { ...mappedColumn };
  delete rest.id;
  const displayName = toRecordText(getRecordFieldValue(field, 'username', 'userName', 'displayName', 'displayname'));
  const fieldName = toRecordText(getRecordFieldValue(field, 'fieldName', 'fieldname'));
  const detailVisibleValue = getRecordFieldValue(field, 'isvisible', 'isVisible');

  return {
    ...rest,
    id: `d_col_${Date.now()}_${index + 1}`,
    backendId: getRecordFieldValue(field, 'id'),
    orderId: toRecordNumber(getRecordFieldValue(field, 'orderid', 'orderId'), index + 1),
    name: displayName || mappedColumn.name || `明细字段 ${index + 1}`,
    sourceField: fieldName,
    visible: toDetailGridFieldVisible(detailVisibleValue, mappedColumn.visible !== false),
  };
}
