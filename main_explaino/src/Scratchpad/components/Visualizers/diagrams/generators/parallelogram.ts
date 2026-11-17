import type { DiagramData } from '../types';

export function ParallelogramGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  _highlighted: string[]
): string {
  const x = data.x ?? 80;
  const y = data.y ?? 90;
  const shapeWidth = data.width ?? 190;
  const shapeHeight = data.height ?? 110;
  const skew = data.skew ?? 45;

  const vertices = [
    { x, y },
    { x: x + shapeWidth, y },
    { x: x + shapeWidth + skew, y: y + shapeHeight },
    { x: x + skew, y: y + shapeHeight },
  ];

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  for (let i = 0; i < 4; i++) {
    const x1 = vertices[i].x;
    const y1 = vertices[i].y;
    const x2 = vertices[(i + 1) % 4].x;
    const y2 = vertices[(i + 1) % 4].y;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1e293b" stroke-width="2"/>`;
  }
  svg += '</svg>';
  return svg;
}

