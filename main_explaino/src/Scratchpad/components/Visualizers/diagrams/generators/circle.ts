import type { DiagramData } from '../types';

export function CircleGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  _highlighted: string[]
): string {
  const cx = data.cx ?? 200;
  const cy = data.cy ?? 145;
  const radius = data.radius ?? 85;
  const measurements = data.measurements || [];

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="rgba(99, 102, 241, 0.06)" stroke="#1e293b" stroke-width="2"/>`;
  svg += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#1e293b"/>`;
  svg += `<text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e293b">O</text>`;
  svg += `<line x1="${cx}" y1="${cy}" x2="${cx + radius}" y2="${cy}" stroke="#4f46e5" stroke-width="1.5" stroke-dasharray="5,4"/>`;

  for (const m of measurements) {
    if (m.type === 'radius') {
      svg += `<text x="${cx + radius / 2}" y="${cy - 8}" text-anchor="middle" font-size="12" fill="#4f46e5">r = ${m.value} ${m.unit}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}

