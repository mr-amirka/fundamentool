/**
 * Утилиты для тестов `src/browser`: CommonJS `export =` часто даёт объект с одной функцией.
 */
export function extractExportedFn(mod: any): any {
  if (typeof mod === 'function') {
    return mod;
  }
  if (mod && typeof mod.default === 'function') {
    return mod.default;
  }
  if (mod) {
    const fn = Object.values(mod).find((v) => typeof v === 'function');
    if (fn) {
      return fn;
    }
  }
  return mod;
}
