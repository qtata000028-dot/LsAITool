export function generateUUID() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }

  return `${Date.now()}${Math.random().toString(16).slice(2)}`;
}
