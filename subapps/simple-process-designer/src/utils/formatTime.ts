export function dateFormatter(_row: unknown, _column: unknown, value: string | number | Date) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN');
}

export function formatPast2(durationInMillis?: number) {
  if (!durationInMillis) {
    return '-';
  }

  const minutes = Math.round(durationInMillis / 60000);
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }

  const hours = (minutes / 60).toFixed(1);
  return `${hours} 小时`;
}
