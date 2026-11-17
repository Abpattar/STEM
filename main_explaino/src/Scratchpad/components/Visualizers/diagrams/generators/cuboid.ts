import type { DiagramData } from '../types';

export function CuboidGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  _highlighted: string[]
): string {
  const x = data.x ?? 185;
  const y = data.y ?? 155;
  const w = data.width ?? 110;
  const h = data.height ?? 80;
  const d = data.depth ?? 60;

  const corners3d = [
    [0, 0, 0],
    [w, 0, 0],
    [w, d, 0],
    [0, d, 0],
    [0, 0, h],
    [w, 0, h],
    [w, d, h],
    [0, d, h],
  ];

  const corners2d = corners3d.map(([cx, cy, cz]) => [
    x + cx * 0.866 - cy * 0.866,
    y + cx * 0.5 + cy * 0.5 - cz,
  ]);

  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  for (const [e1, e2] of edges) {
    const [x1, y1] = corners2d[e1];
    const [x2, y2] = corners2d[e2];
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1e293b" stroke-width="2"/>`;
  }
  svg += '</svg>';
  return svg;
}

