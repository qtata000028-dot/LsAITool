export type BpmModelVO = {
  formId?: number;
  formType?: number;
  id: string;
  name: string;
};

export async function getModelList() {
  return [
    { id: 'child_purchase', name: '采购子流程', formId: 101, formType: 10 },
    { id: 'child_archive', name: '档案归档子流程', formId: 101, formType: 10 },
  ] satisfies BpmModelVO[];
}
