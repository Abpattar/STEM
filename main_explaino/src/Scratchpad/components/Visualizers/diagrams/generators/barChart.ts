import type { DiagramData } from '../types';

export function BarChartGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  _highlighted: string[]
): string {
  const values = data.values || [4, 7, 5, 9];
  const labels = data.labels || ['A', 'B', 'C', 'D'];
  const maxValue = Math.max(...values, 1);

  const barWidth = 44;
  const gap = 24;
  const startX = 65;
  const maxHeight = height - 85;

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<line x1="45" y1="${height - 50}" x2="${width - 35}" y2="${height - 50}" stroke="#64748b" stroke-width="1.5"/>`;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const label = labels[i] || '';
    const x = startX + i * (barWidth + gap);
    const barH = (value / maxValue) * maxHeight;
    const y = height - 50 - barH;

    svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="#6366f1"/>`;
    svg += `<text x="${x + barWidth / 2}" y="${height - 30}" text-anchor="middle" font-size="11" fill="#334155">${label}</text>`;
    svg += `<text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="11" font-weight="bold" fill="#1e293b">${value}</text>`;
  }

  svg += '</svg>';
  return svg;
}

