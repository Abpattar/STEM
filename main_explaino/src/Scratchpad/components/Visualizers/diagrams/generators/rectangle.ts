import type { DiagramData } from '../types';

export function RectangleGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  _highlighted: string[]
): string {
  const x = data.x ?? 80;
  const y = data.y ?? 75;
  const rectWidth = data.width ?? 230;
  const rectHeight = data.height ?? 130;
  const measurements = data.measurements || [];

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect x="${x}" y="${y}" width="${rectWidth}" height="${rectHeight}" fill="rgba(99, 102, 241, 0.06)" stroke="#1e293b" stroke-width="2"/>`;

  for (const m of measurements) {
    if (m.type === 'length') {
      const lower = m.label.toLowerCase();
      if (lower.includes('length') || lower === 'l') {
        svg += `<text x="${x + rectWidth / 2}" y="${y + rectHeight + 24}" text-anchor="middle" font-size="12" fill="#334155">${m.value} ${m.unit}</text>`;
      } else if (lower.includes('width') || lower.includes('breadth') || lower === 'w') {
        svg += `<text x="${x - 16}" y="${y + rectHeight / 2}" text-anchor="middle" font-size="12" fill="#334155" transform="rotate(-90, ${x - 16}, ${y + rectHeight / 2})">${m.value} ${m.unit}</text>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

