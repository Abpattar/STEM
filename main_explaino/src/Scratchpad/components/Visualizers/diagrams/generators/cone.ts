import type { DiagramData } from '../types';

export function ConeGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  _highlighted: string[]
): string {
  const cx = data.cx ?? 200;
  const cy = data.cy ?? 75;
  const r = data.radius ?? 60;
  const h = data.height ?? 135;

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<ellipse cx="${cx}" cy="${cy + h}" rx="${r}" ry="${r / 3}" fill="rgba(99, 102, 241, 0.08)" stroke="#1e293b" stroke-width="2"/>`;
  svg += `<line x1="${cx}" y1="${cy}" x2="${cx - r}" y2="${cy + h}" stroke="#1e293b" stroke-width="2"/>`;
  svg += `<line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy + h}" stroke="#1e293b" stroke-width="2"/>`;
  svg += '</svg>';
  return svg;
}

