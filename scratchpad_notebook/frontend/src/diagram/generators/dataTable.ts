import { DiagramData } from '../types';

export function DataTableGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  _highlighted: string[]
): string {
  const headers = data.headers || [];
  const rows = data.rows || [];

  const col_width = 100;
  const row_height = 30;
  const start_x = 50;
  const start_y = 50;

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  // Headers
  for (let j = 0; j < headers.length; j++) {
    const x = start_x + j * col_width;
    svg += `<rect x="${x}" y="${start_y}" width="${col_width}" height="${row_height}" fill="#0066cc" stroke="#333"/>`;
    svg += `<text x="${x + col_width / 2}" y="${start_y + row_height / 2 + 5}" text-anchor="middle" font-size="12" fill="white" font-weight="bold">${headers[j]}</text>`;
  }

  for (let i = 0; i < rows.length; i++) {
    const y = start_y + row_height + i * row_height;
    for (let j = 0; j < rows[i].length; j++) {
      const x = start_x + j * col_width;
      const fill = i % 2 === 0 ? "#f5f5f5" : "white";
      svg += `<rect x="${x}" y="${y}" width="${col_width}" height="${row_height}" fill="${fill}" stroke="#ddd"/>`;
      svg += `<text x="${x + col_width / 2}" y="${y + row_height / 2 + 5}" text-anchor="middle" font-size="11" fill="#333">${rows[i][j]}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}