import type { DiagramData } from '../types';

export function TriangleGenerator(
  data: DiagramData,
  width: number,
  height: number,
  _mode: 'notebook' | 'textbook',
  highlighted: string[]
): string {
  const vertices = data.vertices || [
    { label: 'A', x: 70, y: 240 },
    { label: 'B', x: 320, y: 240 },
    { label: 'C', x: 185, y: 65 },
  ];
  const measurements = data.measurements || [];

  let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  for (let i = 0; i < 3; i++) {
    const x1 = vertices[i].x;
    const y1 = vertices[i].y;
    const x2 = vertices[(i + 1) % 3].x;
    const y2 = vertices[(i + 1) % 3].y;
    const isHighlighted =
      highlighted.includes(vertices[i].label) ||
      highlighted.includes(vertices[(i + 1) % 3].label);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1e293b" stroke-width="${isHighlighted ? 3 : 2}"${isHighlighted ? ' class="highlighted"' : ''}/>`;
  }

  for (const v of vertices) {
    const isHighlighted = highlighted.includes(v.label);
    svg += `<circle cx="${v.x}" cy="${v.y}" r="4" fill="#1e293b"/>`;
    svg += `<text x="${v.x}" y="${v.y - 14}" text-anchor="middle" font-size="14" font-weight="bold" fill="${isHighlighted ? '#4f46e5' : '#1e293b'}">${v.label}</text>`;
  }

  measurements.forEach((m, idx) => {
    if (m.type === 'length') {
      svg += `<text x="${width / 2}" y="${height - 14 - idx * 16}" text-anchor="middle" font-size="12" fill="#475569">${m.label} = ${m.value} ${m.unit}</text>`;
    }
  });

  svg += '</svg>';
  return svg;
}

