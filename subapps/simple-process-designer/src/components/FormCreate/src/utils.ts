type ParsedField = {
  field: string;
  title: string;
  required?: boolean;
};

export function parseFormFields(source: any, output: ParsedField[] = []) {
  if (!source) {
    return output;
  }

  if (Array.isArray(source)) {
    source.forEach((item) => parseFormFields(item, output));
    return output;
  }

  if (typeof source === 'object') {
    if (source.field && source.title) {
      output.push({
        field: String(source.field),
        title: String(source.title),
        required: Boolean(source.required),
      });
    }

    Object.values(source).forEach((value) => {
      if (Array.isArray(value) || (value && typeof value === 'object')) {
        parseFormFields(value, output);
      }
    });
  }

  return output;
}
