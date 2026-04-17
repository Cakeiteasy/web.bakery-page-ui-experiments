/**
 * Shared Tailwind CSS marker constants and strip/merge utilities.
 * Safe for both browser (Angular) and Node.js (API) environments.
 */

export const TW_START_MARKER = '/* @tw-start */';
export const TW_END_MARKER = '/* @tw-end */';

export function stripTailwindFromCss(mergedCss: string): string {
  const startIdx = mergedCss.indexOf(TW_START_MARKER);
  const endIdx = mergedCss.indexOf(TW_END_MARKER);
  if (startIdx === -1 || endIdx === -1) return mergedCss;

  const before = mergedCss.slice(0, startIdx);
  const after = mergedCss.slice(endIdx + TW_END_MARKER.length);
  return (before + after).trim();
}

export function mergeTailwindIntoCss(tailwindCss: string, customCss: string): string {
  if (!tailwindCss) return customCss;

  const parts = [TW_START_MARKER, tailwindCss, TW_END_MARKER];
  if (customCss.trim()) {
    parts.push('', customCss);
  }

  return parts.join('\n');
}
