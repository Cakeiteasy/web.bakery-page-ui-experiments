const HEX_PATTERN = /^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/;

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function normalizeHexColor(color: string | null | undefined, fallback: string): string {
  if (!color) {
    return normalizeHexColor(fallback, '#000000');
  }

  const trimmed = color.trim();
  if (!HEX_PATTERN.test(trimmed)) {
    return normalizeHexColor(fallback, '#000000');
  }

  if (trimmed.length === 4) {
    const shortHex = trimmed.slice(1);
    return `#${shortHex[0]}${shortHex[0]}${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}`.toLowerCase();
  }

  return trimmed.toLowerCase();
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = normalizeHexColor(foreground, '#111111');
  const bg = normalizeHexColor(background, '#ffffff');

  const fgLuminance = getRelativeLuminance(hexToRgb(fg));
  const bgLuminance = getRelativeLuminance(hexToRgb(bg));
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function pickReadableText(background: string, dark = '#111111', light = '#ffffff'): string {
  const bg = normalizeHexColor(background, '#ffffff');
  const darkColor = normalizeHexColor(dark, '#111111');
  const lightColor = normalizeHexColor(light, '#ffffff');

  const darkContrast = contrastRatio(darkColor, bg);
  const lightContrast = contrastRatio(lightColor, bg);

  return darkContrast >= lightContrast ? darkColor : lightColor;
}

export function ensureTextContrast(text: string, background: string, minRatio: number): string {
  const normalizedText = normalizeHexColor(text, '#111111');
  const normalizedBackground = normalizeHexColor(background, '#ffffff');

  if (contrastRatio(normalizedText, normalizedBackground) >= minRatio) {
    return normalizedText;
  }

  return pickReadableText(normalizedBackground);
}

export function mixHexColors(first: string, second: string, firstWeight = 0.5): string {
  const safeFirst = normalizeHexColor(first, '#111111');
  const safeSecond = normalizeHexColor(second, '#ffffff');
  const firstRgb = hexToRgb(safeFirst);
  const secondRgb = hexToRgb(safeSecond);
  const weight = clamp(firstWeight, 0, 1);

  return rgbToHex({
    r: Math.round(firstRgb.r * weight + secondRgb.r * (1 - weight)),
    g: Math.round(firstRgb.g * weight + secondRgb.g * (1 - weight)),
    b: Math.round(firstRgb.b * weight + secondRgb.b * (1 - weight))
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHexColor(hex, '#000000');
  const value = normalized.slice(1);

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHex(color: RgbColor): string {
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function toHex(value: number): string {
  return clamp(value, 0, 255).toString(16).padStart(2, '0');
}

function getRelativeLuminance(color: RgbColor): number {
  const red = toLinearSrgb(color.r);
  const green = toLinearSrgb(color.g);
  const blue = toLinearSrgb(color.b);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function toLinearSrgb(channel: number): number {
  const value = channel / 255;
  if (value <= 0.03928) {
    return value / 12.92;
  }

  return ((value + 0.055) / 1.055) ** 2.4;
}
