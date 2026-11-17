import { useRef, useCallback, useEffect, useState } from 'react';
import type { Point, Stroke } from '../types/canvas';
import { useStrokes } from './useStrokes';

interface UseCanvasOptions {
  onStrokesChange?: (strokes: Stroke[]) => void;
}

export function useCanvas(options: UseCanvasOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<Point[]>([]);

  const {
    strokes,
    canUndo,
    canRedo,
    addStroke,
    undo,
    redo,
    clear
  } = useStrokes();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const scale = window.devicePixelRatio || 1;
      canvas.width = width * scale;
      canvas.height = height * scale;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(scale, scale);
      setContainerSize({ width, height });
      redraw();
    };

    const redraw = () => {
      if (!ctxRef.current) return;
      const ctx = ctxRef.current;
      const { width, height } = containerSize;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#fefefe';
      ctx.fillRect(0, 0, width, height);

      for (const stroke of strokes) {
        if (stroke.points.length < 2) continue;
        drawStroke(ctx, stroke);
      }
    };

    const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#fefefe' : stroke.color;
      ctx.lineWidth = stroke.width;

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [strokes, containerSize]);

  useEffect(() => {
    options.onStrokesChange?.(strokes);
  }, [strokes, options.onStrokesChange]);

  const getCanvasPoint = useCallback((event: React.PointerEvent | PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, timestamp: Date.now() };

    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;

    return {
      x: (event.clientX - rect.left) * scale,
      y: (event.clientY - rect.top) * scale,
      pressure: event.pressure,
      timestamp: Date.now()
    };
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    setIsDrawing(true);

    const point = getCanvasPoint(event);
    currentStrokeRef.current = [point];
  }, [getCanvasPoint]);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!isDrawing) return;

    const point = getCanvasPoint(event);
    currentStrokeRef.current.push(point);

    const ctx = ctxRef.current;
    if (!ctx) return;

    const prevPoint = currentStrokeRef.current[currentStrokeRef.current.length - 2];
    if (!prevPoint) return;

    ctx.beginPath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.moveTo(prevPoint.x, prevPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }, [isDrawing, getCanvasPoint]);

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId);
    }

    setIsDrawing(false);

    if (currentStrokeRef.current.length >= 2) {
      const stroke: Stroke = {
        id: crypto.randomUUID(),
        points: [...currentStrokeRef.current],
        tool: 'pen',
        color: '#000000',
        width: 2,
        timestamp: Date.now()
      };
      addStroke(stroke);
    }

    currentStrokeRef.current = [];
    redraw();
  }, [isDrawing, addStroke]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const { width, height } = containerSize;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fefefe';
    ctx.fillRect(0, 0, width, height);

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#fefefe' : stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, containerSize]);

  const handleErase = useCallback((event: React.PointerEvent) => {
    if (!isDrawing) return;

    const point = getCanvasPoint(event);
    currentStrokeRef.current.push(point);

    const ctx = ctxRef.current;
    if (!ctx) return;

    const prevPoint = currentStrokeRef.current[currentStrokeRef.current.length - 2];
    if (!prevPoint) return;

    ctx.beginPath();
    ctx.strokeStyle = '#fefefe';
    ctx.lineWidth = 20;
    ctx.moveTo(prevPoint.x, prevPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }, [isDrawing, getCanvasPoint]);

  return {
    canvasRef,
    containerSize,
    isDrawing,
    canUndo,
    canRedo,
    strokeCount: strokes.length,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleErase,
    undo,
    redo,
    clear
  };
}