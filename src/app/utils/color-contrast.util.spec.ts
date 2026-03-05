import {
  contrastRatio,
  ensureTextContrast,
  mixHexColors,
  normalizeHexColor,
  pickReadableText
} from './color-contrast.util';

describe('color-contrast.util', () => {
  it('normalizes 3-character hex colors', () => {
    expect(normalizeHexColor('#abc', '#000000')).toBe('#aabbcc');
  });

  it('picks readable text color for background', () => {
    expect(pickReadableText('#ffffff')).toBe('#111111');
    expect(pickReadableText('#1a1a1a')).toBe('#ffffff');
  });

  it('forces contrast above threshold when text color is too weak', () => {
    const adjusted = ensureTextContrast('#bdbdbd', '#ffffff', 4.5);

    expect(contrastRatio(adjusted, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('mixes colors using provided weight', () => {
    const mixed = mixHexColors('#000000', '#ffffff', 0.5);

    expect(mixed).toBe('#808080');
  });
});
