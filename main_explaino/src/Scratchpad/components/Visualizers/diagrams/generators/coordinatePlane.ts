import type { DiagramData } from '../types';

export function CoordinatePlaneGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  highlighted: string[]
): string {
  const points = data.points || [];
  const lines = data.lines || [];

  if (points.length === 0) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" text-anchor="middle" font-size="16" fill="#64748b">No points</text></svg>`;
  }

  const allX = points.map((p) => p.x);
  const allY = points.map((p) => p.y);
  const minX = Math.min(...allX, 0) - 1;
  const maxX = Math.max(...allX, 0) + 1;
  const minY = Math.min(...allY, 0) - 1;
  const maxY = Math.max(...allY, 0) + 1;

  const margin = 40;
  const plotWidth = width - 2 * margin;
  const plotHeight = height - 2 * margin;

  const mapX = (x: number) => margin + ((x - minX) / (maxX - minX)) * plotWidth;
  const mapY = (y: number) => height - margin - ((y - minY) / (maxY - minY)) * plotHeight;

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  const xAxisY = mapY(0);
  const yAxisX = mapX(0);
  svg += `<line x1="${margin}" y1="${xAxisY}" x2="${width - margin}" y2="${xAxisY}" stroke="#64748b" stroke-width="1.5"/>`;
  svg += `<line x1="${yAxisX}" y1="${margin}" x2="${yAxisX}" y2="${height - margin}" stroke="#64748b" stroke-width="1.5"/>`;

  for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
    if (x !== 0) {
      const xPos = mapX(x);
      svg += `<line x1="${xPos}" y1="${margin}" x2="${xPos}" y2="${height - margin}" stroke="#e2e8f0" stroke-width="0.75"/>`;
    }
  }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    if (y !== 0) {
      const yPos = mapY(y);
      svg += `<line x1="${margin}" y1="${yPos}" x2="${width - margin}" y2="${yPos}" stroke="#e2e8f0" stroke-width="0.75"/>`;
    }
  }

  for (const line of lines) {
    const p1 = points.find((p) => p.label === line.point1);
    const p2 = points.find((p) => p.label === line.point2);
    if (!p1 || !p2) continue;
    svg += `<line x1="${mapX(p1.x)}" y1="${mapY(p1.y)}" x2="${mapX(p2.x)}" y2="${mapY(p2.y)}" stroke="#4f46e5" stroke-width="2"/>`;
  }

  for (const p of points) {
    const xPos = mapX(p.x);
    const yPos = mapY(p.y);
    const isHighlighted = highlighted.includes(p.label);
    svg += `<circle cx="${xPos}" cy="${yPos}" r="4.5" fill="${isHighlighted ? '#2563eb' : '#4f46e5'}"/>`;
    svg += `<text x="${xPos + 8}" y="${yPos - 8}" font-size="12" fill="${isHighlighted ? '#2563eb' : '#1e293b'}">${p.label} (${p.x}, ${p.y})</text>`;
  }

  svg += '</svg>';
  return svg;
}

