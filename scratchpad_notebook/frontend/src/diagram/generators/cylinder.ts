import { DiagramData } from '../types';

export function CylinderGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  _highlighted: string[]
): string {
  const cx = data.cx ?? 200;
  const cy = data.cy ?? 150;
  const r = data.radius ?? 50;
  const h = data.height ?? 100;

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Top ellipse
  svg += `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r/3}" fill="none" stroke="#333" stroke-width="2"/>`;

  // Sides
  svg += `<line x1="${cx - r}" y1="${cy}" x2="${cx - r}" y2="${cy + h}" stroke="#333" stroke-width="2"/>`;
  svg += `<line x1="${cx + r}" y1="${cy}" x2="${cx + r}" y2="${cy + h}" stroke="#333" stroke-width="2"/>`;

  // Bottom ellipse
  svg += `<ellipse cx="${cx}" cy="${cy + h}" rx="${r}" ry="${r/3}" fill="none" stroke="#333" stroke-width="2" stroke-dasharray="5,5"/>`;

  svg += '</svg>';
  return svg;
}