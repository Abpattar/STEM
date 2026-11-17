import type { Stroke } from '../types/canvas';

export function strokesToImage(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  backgroundColor = '#ffffff'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;

    ctx.beginPath();
    ctx.strokeStyle = stroke.tool === 'eraser' ? backgroundColor : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

export function canvasToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

export function resizeCanvasForDisplay(
  canvas: HTMLCanvasElement,
  displayWidth: number,
  displayHeight: number
): void {
  const scale = window.devicePixelRatio || 1;
  canvas.width = displayWidth * scale;
  canvas.height = displayHeight * scale;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(scale, scale);
  }
}