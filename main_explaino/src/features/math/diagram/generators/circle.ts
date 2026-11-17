import { DiagramData } from '../types';

export function CircleGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  _highlighted: string[]
): string {
  const cx = data.cx ?? 200;
  const cy = data.cy ?? 150;
  const radius = data.radius ?? 80;
  const measurements = data.measurements || [];

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#333" stroke-width="2"/>`;

  svg += `<circle cx="${cx}" cy="${cy}" r="3" fill="#333"/>`;
  svg += `<text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="12">O</text>`;

  svg += `<line x1="${cx}" y1="${cy}" x2="${cx + radius}" y2="${cy}" stroke="#666" stroke-width="1" stroke-dasharray="5,5"/>`;

  for (const m of measurements) {
    if (m.type === 'radius') {
      svg += `<text x="${cx + radius/2}" y="${cy - 10}" text-anchor="middle" font-size="12">${m.value} ${m.unit}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}