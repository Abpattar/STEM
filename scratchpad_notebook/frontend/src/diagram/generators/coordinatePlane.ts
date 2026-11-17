import { DiagramData } from '../types';

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
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" text-anchor="middle" font-size="16" fill="#666">No points</text></svg>`;
  }

  const all_x = points.map(p => p.x);
  const all_y = points.map(p => p.y);
  const min_x = Math.min(...all_x) - 1;
  const max_x = Math.max(...all_x) + 1;
  const min_y = Math.min(...all_y) - 1;
  const max_y = Math.max(...all_y) + 1;

  const margin = 40;
  const plot_width = width - 2 * margin;
  const plot_height = height - 2 * margin;

  const map_x = (x: number) => margin + (x - min_x) / (max_x - min_x) * plot_width;
  const map_y = (y: number) => height - margin - (y - min_y) / (max_y - min_y) * plot_height;

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Axes
  const x_axis_y = map_y(0);
  const y_axis_x = map_x(0);
  svg += `<line x1="${margin}" y1="${x_axis_y}" x2="${width - margin}" y2="${x_axis_y}" stroke="#999" stroke-width="1"/>`;
  svg += `<line x1="${y_axis_x}" y1="${margin}" x2="${y_axis_x}" y2="${height - margin}" stroke="#999" stroke-width="1"/>`;

  // Grid lines
  for (let x = Math.ceil(min_x); x <= Math.floor(max_x); x++) {
    if (x !== 0) {
      const x_pos = map_x(x);
      svg += `<line x1="${x_pos}" y1="${margin}" x2="${x_pos}" y2="${height - margin}" stroke="#eee" stroke-width="0.5"/>`;
    }
  }
  for (let y = Math.ceil(min_y); y <= Math.floor(max_y); y++) {
    if (y !== 0) {
      const y_pos = map_y(y);
      svg += `<line x1="${margin}" y1="${y_pos}" x2="${width - margin}" y2="${y_pos}" stroke="#eee" stroke-width="0.5"/>`;
    }
  }

  // Draw points
  for (const p of points) {
    const x_pos = map_x(p.x);
    const y_pos = map_y(p.y);
    const isHighlighted = highlighted.includes(p.label);
    svg += `<circle cx="${x_pos}" cy="${y_pos}" r="4" fill="${isHighlighted ? '#2d6cdf' : '#0066cc'}"/>`;
    svg += `<text x="${x_pos + 8}" y="${y_pos - 8}" font-size="12" fill="${isHighlighted ? '#2d6cdf' : '#0066cc'}">${p.label} (${p.x}, ${p.y})</text>`;
  }

  // Draw lines
  for (const line of lines) {
    const p1 = points.find(p => p.label === line.point1);
    const p2 = points.find(p => p.label === line.point2);
    if (!p1 || !p2) continue;
    const x1 = map_x(p1.x);
    const y1 = map_y(p1.y);
    const x2 = map_x(p2.x);
    const y2 = map_y(p2.y);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0066cc" stroke-width="2"/>`;
  }

  svg += '</svg>';
  return svg;
}