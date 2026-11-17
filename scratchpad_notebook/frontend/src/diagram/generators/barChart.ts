import { DiagramData } from '../types';

export function BarChartGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  _highlighted: string[]
): string {
  const values = data.values || [];
  const labels = data.labels || [];
  const max_value = Math.max(...values, 1);

  const bar_width = 40;
  const gap = 20;
  const start_x = 50;
  const max_height = height - 80;

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const label = labels[i] || '';
    const x = start_x + i * (bar_width + gap);
    const barH = (value / max_value) * max_height;
    const y = height - 50 - barH;

    svg += `<rect x="${x}" y="${y}" width="${bar_width}" height="${barH}" fill="#0066cc"/>`;
    svg += `<text x="${x + bar_width/2}" y="${height - 30}" text-anchor="middle" font-size="11">${label}</text>`;
    svg += `<text x="${x + bar_width/2}" y="${y - 5}" text-anchor="middle" font-size="11" fill="#333">${value}</text>`;
  }

  svg += '</svg>';
  return svg;
}