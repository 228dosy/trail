export interface ColorShade {
  label: string;
  hex: string;
  step: number; // -10 (lightest) to +10 (darkest), 0 = base
}

export interface ColorFamily {
  id: string;
  name: string;
  baseHex: string;
  shades: ColorShade[]; // 10 lighter + base + 10 darker = 21
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
  );
}

function mixHex(hexA: string, hexB: string, ratioB: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return rgbToHex(
    r1 + (r2 - r1) * ratioB,
    g1 + (g2 - g1) * ratioB,
    b1 + (b2 - b1) * ratioB,
  );
}

function buildShades(name: string, baseHex: string): ColorShade[] {
  const shades: ColorShade[] = [];
  // 10 lighter shades (L10 brightest down to L1)
  for (let i = 10; i >= 1; i--) {
    const ratio = i * 0.086; // 8.6% to 86% toward white
    shades.push({
      label: `${name} Light ${i}`,
      hex: mixHex(baseHex, '#ffffff', ratio),
      step: -i,
    });
  }
  // Base color
  shades.push({
    label: `${name} Base`,
    hex: baseHex.toLowerCase(),
    step: 0,
  });
  // 10 darker shades (D1 to D10 darkest)
  for (let i = 1; i <= 10; i++) {
    const ratio = i * 0.084; // 8.4% to 84% toward deep black
    shades.push({
      label: `${name} Dark ${i}`,
      hex: mixHex(baseHex, '#05070a', ratio),
      step: i,
    });
  }
  return shades;
}

const BASE_22_COLORS: Array<[string, string, string]> = [
  ['red', 'Red', '#ef4444'],
  ['crimson', 'Crimson', '#dc2626'],
  ['coral', 'Coral', '#f97362'],
  ['orange', 'Orange', '#f97316'],
  ['amber', 'Amber', '#f59e0b'],
  ['gold', 'Gold', '#eab308'],
  ['yellow', 'Yellow', '#facc15'],
  ['lime', 'Lime', '#84cc16'],
  ['chartreuse', 'Chartreuse', '#a3e635'],
  ['green', 'Green', '#22c55e'],
  ['emerald', 'Emerald', '#10b981'],
  ['mint', 'Mint', '#34d399'],
  ['teal', 'Teal', '#14b8a6'],
  ['cyan', 'Cyan', '#06b6d4'],
  ['sky', 'Sky Blue', '#0ea5e9'],
  ['azure', 'Azure', '#3b82f6'],
  ['blue', 'Royal Blue', '#2563eb'],
  ['indigo', 'Indigo', '#6366f1'],
  ['violet', 'Violet', '#8b5cf6'],
  ['purple', 'Purple', '#a855f7'],
  ['magenta', 'Magenta', '#d946ef'],
  ['rose', 'Rose', '#f43f5e'],
];

export const COLOR_FAMILIES: ColorFamily[] = BASE_22_COLORS.map(([id, name, baseHex]) => ({
  id,
  name,
  baseHex,
  shades: buildShades(name, baseHex),
}));

export const NEUTRAL_SHADES: ColorShade[] = [
  { label: 'Pure White', hex: '#ffffff', step: -10 },
  { label: 'Snow Grey', hex: '#f1f5f9', step: -8 },
  { label: 'Silver Mist', hex: '#e2e8f0', step: -6 },
  { label: 'Cloud Grey', hex: '#cbd5e1', step: -4 },
  { label: 'Cool Grey', hex: '#aeb5b9', step: -2 },
  { label: 'Neutral Grey', hex: '#858b91', step: 0 },
  { label: 'Slate Grey', hex: '#64748b', step: 2 },
  { label: 'Steel Grey', hex: '#50565c', step: 4 },
  { label: 'Charcoal', hex: '#30363b', step: 6 },
  { label: 'Obsidian', hex: '#171a1d', step: 8 },
  { label: 'Pure Black', hex: '#090c10', step: 10 },
];

export function findColorLabel(hex: string): string {
  const norm = String(hex || '').toLowerCase();
  const neutral = NEUTRAL_SHADES.find((s) => s.hex.toLowerCase() === norm);
  if (neutral) return neutral.label;
  for (const fam of COLOR_FAMILIES) {
    const found = fam.shades.find((s) => s.hex.toLowerCase() === norm);
    if (found) return found.label;
  }
  return norm.toUpperCase();
}

export const CARD_COLORS: string[] = [
  '#dff4fa',
  '#e5f3da',
  '#fff0c9',
  '#efe4fa',
  '#ffe2de',
  '#d9f0e6',
  '#e2e9ff',
  '#f9e8d5',
  '#d8ecf8',
  '#eae7d4',
  '#fae2ef',
  '#e1eee8',
  '#e6e0f6',
  '#f3ead8',
  '#dceaf0',
  '#f6e3d6',
  '#e3f0d7',
  '#e2e4f8',
  '#f7eadb',
  '#e1f1ef',
];

export function randomizedCardColors(count: number): string[] {
  const colors = [...CARD_COLORS];
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  return colors.slice(0, count);
}
