import type { DiagramData } from '../types';

export function DataTableGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  _highlighted: string[]
): string {
  const headers = data.headers || ['x', 'y = 2x + 1'];
  const rows = data.rows || [
    ['0', '1'],
    ['1', '3'],
    ['2', '5'],
    ['3', '7'],
  ];

  const colWidth = Math.min(130, Math.floor((width - 80) / Math.max(headers.length, 1)));
  const rowHeight = 32;
  const startX = Math.max(40, Math.floor((width - colWidth * headers.length) / 2));
  const startY = 48;

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  for (let j = 0; j < headers.length; j++) {
    const x = startX + j * colWidth;
    svg += `<rect x="${x}" y="${startY}" width="${colWidth}" height="${rowHeight}" fill="#4f46e5" stroke="#312e81"/>`;
    svg += `<text x="${x + colWidth / 2}" y="${startY + rowHeight / 2 + 5}" text-anchor="middle" font-size="12" fill="white" font-weight="bold">${headers[j]}</text>`;
  }

  for (let i = 0; i < rows.length; i++) {
    const y = startY + rowHeight + i * rowHeight;
    for (let j = 0; j < rows[i].length; j++) {
      const x = startX + j * colWidth;
      const fill = i % 2 === 0 ? '#f8fafc' : '#ffffff';
      svg += `<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="${fill}" stroke="#cbd5e1"/>`;
      svg += `<text x="${x + colWidth / 2}" y="${y + rowHeight / 2 + 5}" text-anchor="middle" font-size="12" fill="#1e293b">${rows[i][j]}</text>`;
    }
  }

  svg += '</svg>';
  return svg;
}

