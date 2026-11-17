import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useTouchAction } from '../../hooks/useTouchAction';
import type { Stroke } from '../../types/canvas';

export interface MathCanvasProps {
  strokes: Stroke[];
  onStrokesChange: (strokes: Stroke[]) => void;
  tool: 'pen' | 'eraser' | 'select';
  penColor: string;
  penWidth: number;
  eraserWidth: number;
  onToolChange: (tool: 'pen' | 'eraser' | 'select') => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  disabled?: boolean;
  onExportCanvas?: (exportFn: () => string) => void;
  onCanvasElement?: (el: HTMLCanvasElement | null) => void;
}

function drawSmoothStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length < 2) return;
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.tool === 'eraser' ? '#fefefe' : stroke.color;
  ctx.lineWidth = stroke.width;

  const pts = stroke.points;
  ctx.moveTo(pts[0].x, pts[0].y);

  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }
  ctx.stroke();
}

export function MathCanvas({
  strokes,
  onStrokesChange,
  tool,
  penColor,
  penWidth,
  eraserWidth,
  onToolChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  disabled = false,
  onExportCanvas,
  onCanvasElement,
}: MathCanvasProps) {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [isDraggingShape, setIsDraggingShape] = useState<boolean>(false);
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const currentStrokeRef = useRef<{ x: number; y: number; pressure?: number; timestamp: number }[]>([]);
  const strokeIdRef = useRef(0);

  useTouchAction(canvasRef, !disabled);

  useEffect(() => {
    onCanvasElement?.(canvasRef.current);
    return () => onCanvasElement?.(null);
  }, [onCanvasElement]);

  const strokesRef = useRef(strokes);
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    if (!onExportCanvas) return;
    onExportCanvas(() => {
      const canvas = canvasRef.current;
      if (!canvas) return '';
      const currentStrokes = strokesRef.current;
      if (!currentStrokes || currentStrokes.length === 0) {
        return canvas.toDataURL('image/png');
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const s of currentStrokes) {
        for (const pt of s.points) {
          if (pt.x < minX) minX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y > maxY) maxY = pt.y;
        }
      }

      if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
        return canvas.toDataURL('image/png');
      }

      const scale = window.devicePixelRatio || 1;
      const padding = 28;
      const cropX = Math.max(0, (minX - padding) * scale);
      const cropY = Math.max(0, (minY - padding) * scale);
      const cropW = Math.min(canvas.width - cropX, (maxX - minX + padding * 2) * scale);
      const cropH = Math.min(canvas.height - cropY, (maxY - minY + padding * 2) * scale);

      if (cropW <= 0 || cropH <= 0) {
        return canvas.toDataURL('image/png');
      }

      const maxDim = 800;
      let destW = cropW;
      let destH = cropH;
      if (destW > maxDim || destH > maxDim) {
        const ratio = Math.min(maxDim / destW, maxDim / destH);
        destW = Math.round(destW * ratio);
        destH = Math.round(destH * ratio);
      }

      const offscreen = document.createElement('canvas');
      offscreen.width = destW;
      offscreen.height = destH;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return canvas.toDataURL('image/png');

      offCtx.fillStyle = '#ffffff';
      offCtx.fillRect(0, 0, destW, destH);
      offCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, destW, destH);

      return offscreen.toDataURL('image/jpeg', 0.85);
    });
  }, [onExportCanvas]);

  const getShapeBoundingBox = useCallback((targetId: string) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let found = false;
    for (const s of strokesRef.current) {
      if (s.shapeId === targetId || s.id === targetId) {
        for (const p of s.points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
          found = true;
        }
      }
    }
    if (!found) return null;
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }, []);

  const findShapeAtPoint = useCallback(
    (px: number, py: number): string | null => {
      const shapeIds = Array.from(
        new Set(strokesRef.current.map((s) => s.shapeId).filter(Boolean))
      ) as string[];
      for (const sid of shapeIds) {
        const box = getShapeBoundingBox(sid);
        if (box) {
          const margin = 16;
          if (
            px >= box.minX - margin &&
            px <= box.maxX + margin &&
            py >= box.minY - margin &&
            py <= box.maxY + margin
          ) {
            return sid;
          }
        }
      }
      for (const s of strokesRef.current) {
        for (const p of s.points) {
          if (Math.hypot(p.x - px, p.y - py) <= 20) {
            return s.shapeId || s.id;
          }
        }
      }
      return null;
    },
    [getShapeBoundingBox]
  );

  const deleteSelectedShape = useCallback(() => {
    if (!selectedShapeId) return;
    const remaining = strokes.filter(
      (s) => s.shapeId !== selectedShapeId && s.id !== selectedShapeId
    );
    onStrokesChange(remaining);
    setSelectedShapeId(null);
  }, [selectedShapeId, strokes, onStrokesChange]);

  const renderCanvasContent = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, list: Stroke[]) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#fefefe';
      ctx.fillRect(0, 0, width, height);

      for (const stroke of list) {
        drawSmoothStroke(ctx, stroke);
      }

      if (selectedShapeId) {
        const box = getShapeBoundingBox(selectedShapeId);
        if (box) {
          ctx.save();
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          const pad = 10;
          ctx.strokeRect(box.minX - pad, box.minY - pad, box.w + pad * 2, box.h + pad * 2);
          ctx.setLineDash([]);

          const badgeText = 'Drag to Move Shape';
          ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
          const textW = ctx.measureText(badgeText).width;
          const badgeX = box.minX - pad + (box.w + pad * 2) / 2 - (textW + 16) / 2;
          const badgeY = Math.max(4, box.minY - pad - 22);

          ctx.fillStyle = '#6366f1';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(badgeX, badgeY, textW + 16, 18, 4);
          } else {
            ctx.rect(badgeX, badgeY, textW + 16, 18);
          }
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.fillText(badgeText, badgeX + 8, badgeY + 13);

          const corners = [
            [box.minX - pad, box.minY - pad],
            [box.maxX + pad, box.minY - pad],
            [box.minX - pad, box.maxY + pad],
            [box.maxX + pad, box.maxY + pad],
          ];
          ctx.fillStyle = '#818cf8';
          corners.forEach(([cx, cy]) => {
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#4f46e5';
            ctx.stroke();
          });
          ctx.restore();
        }
      }
    },
    [selectedShapeId, getShapeBoundingBox]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width <= 0 || height <= 0) return;

      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctxRef.current = ctx;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      setContainerSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
      renderCanvasContent(ctx, width, height, strokesRef.current);
    };

    resize();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => resize());
      observer.observe(container);
    }
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      observer?.disconnect();
    };
  }, [renderCanvasContent]);

  useEffect(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const scale = window.devicePixelRatio || 1;
    const width = containerSize.width || canvas.width / scale;
    const height = containerSize.height || canvas.height / scale;
    if (width <= 0 || height <= 0) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    renderCanvasContent(ctx, width, height, strokes);
  }, [strokes, containerSize, renderCanvasContent]);

  const getCanvasPoint = useCallback((event: React.PointerEvent | PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, timestamp: Date.now() };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pressure: event.pressure,
      timestamp: Date.now(),
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      event.preventDefault();
      const point = getCanvasPoint(event);

      if (tool === 'select') {
        const targetId = findShapeAtPoint(point.x, point.y);
        if (targetId) {
          setSelectedShapeId(targetId);
          setIsDraggingShape(true);
          dragStartRef.current = { x: point.x, y: point.y };
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch {
            // Pointer capture may fail for synthetic events
          }
        } else {
          setSelectedShapeId(null);
        }
        return;
      }

      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic events without active pointerId
      }
      setIsDrawing(true);
      currentStrokeRef.current = [point];
      strokeIdRef.current = Date.now();
    },
    [disabled, tool, getCanvasPoint, findShapeAtPoint]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const point = getCanvasPoint(event);

      if (tool === 'select') {
        if (isDraggingShape && dragStartRef.current && selectedShapeId) {
          const dx = point.x - dragStartRef.current.x;
          const dy = point.y - dragStartRef.current.y;
          dragStartRef.current = { x: point.x, y: point.y };

          const updated = strokesRef.current.map((s) => {
            if (s.shapeId === selectedShapeId || s.id === selectedShapeId) {
              return {
                ...s,
                points: s.points.map((p) => ({
                  ...p,
                  x: p.x + dx,
                  y: p.y + dy,
                })),
              };
            }
            return s;
          });
          onStrokesChange(updated);
        } else {
          const hovered = findShapeAtPoint(point.x, point.y);
          setHoveredShapeId(hovered);
        }
        return;
      }

      if (!isDrawing) return;

      currentStrokeRef.current.push(point);

      const ctx = ctxRef.current;
      if (!ctx) return;

      const pts = currentStrokeRef.current;
      const prevPoint = pts[pts.length - 2];
      if (!prevPoint) return;

      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = tool === 'eraser' ? '#fefefe' : penColor;
      ctx.lineWidth = tool === 'eraser' ? eraserWidth : penWidth;
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    },
    [
      disabled,
      tool,
      isDraggingShape,
      selectedShapeId,
      onStrokesChange,
      findShapeAtPoint,
      isDrawing,
      penColor,
      eraserWidth,
      penWidth,
      getCanvasPoint,
    ]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (disabled) return;
      const canvas = canvasRef.current;

      if (tool === 'select') {
        if (isDraggingShape) {
          setIsDraggingShape(false);
          dragStartRef.current = null;
          if (canvas) {
            try {
              canvas.releasePointerCapture(event.pointerId);
            } catch {
              // Ignore if not captured
            }
          }
        }
        return;
      }

      if (!isDrawing) return;

      if (canvas) {
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore if not captured
        }
      }

      setIsDrawing(false);

      if (currentStrokeRef.current.length >= 2) {
        const stroke: Stroke = {
          id: `stroke-${strokeIdRef.current}`,
          points: [...currentStrokeRef.current],
          tool,
          color: tool === 'eraser' ? '#fefefe' : penColor,
          width: tool === 'eraser' ? eraserWidth : penWidth,
          timestamp: Date.now(),
        };
        onStrokesChange([...strokesRef.current, stroke]);
      }

      currentStrokeRef.current = [];
    },
    [disabled, tool, isDraggingShape, isDrawing, penColor, eraserWidth, penWidth, onStrokesChange]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedShapeId && tool === 'select') {
          deleteSelectedShape();
        }
      }

      if (event.key === 'm' || event.key === 'M' || event.key === 'v' || event.key === 'V') {
        onToolChange('select');
      } else if (event.key === 'p' || event.key === 'P') {
        onToolChange('pen');
      } else if (event.key === 'e' || event.key === 'E') {
        onToolChange('eraser');
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
      }
    },
    [disabled, selectedShapeId, tool, deleteSelectedShape, onToolChange, onUndo, onRedo]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target as Node)) {
        setIsShapeMenuOpen(false);
      }
    };
    if (isShapeMenuOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      return () => document.removeEventListener('pointerdown', handleClickOutside);
    }
  }, [isShapeMenuOpen]);

  const insertShape = useCallback(
    (type: 'right_triangle' | 'triangle' | 'square' | 'rectangle' | 'circle') => {
      setIsShapeMenuOpen(false);
      const canvas = canvasRef.current;
      const cw = containerSize.width || (canvas ? canvas.width / (window.devicePixelRatio || 1) : 600);
      const ch = containerSize.height || (canvas ? canvas.height / (window.devicePixelRatio || 1) : 400);
      const cx = Math.round(cw / 2);
      const cy = Math.round(ch / 2);
      const now = Date.now();
      const shapeId = `shape-${type}-${now}`;

      const existingShapes = Array.from(new Set(strokes.map((s) => s.shapeId).filter(Boolean)));
      const hasCenterStrokes = strokes.some((s) =>
        s.points.some((p) => Math.abs(p.x - cx) < 80 && Math.abs(p.y - cy) < 80)
      );

      let shapeCx = cx;
      let shapeCy = cy;
      if (hasCenterStrokes || existingShapes.length > 0) {
        const idx = existingShapes.length + 1;
        const col = idx % 2 === 1 ? 1 : -1;
        const step = Math.ceil(idx / 2) * 150;
        shapeCx = Math.max(120, Math.min(cw - 120, cx + col * step));
        if (shapeCx <= 120 || shapeCx >= cw - 120) {
          shapeCy = Math.max(90, Math.min(ch - 90, cy + (idx % 3 === 0 ? -90 : 90)));
        }
      }

      const newStrokes: Stroke[] = [];

      if (type === 'right_triangle') {
        const x0 = shapeCx - 80;
        const y0 = shapeCy + 55;
        const x1 = shapeCx + 80;
        const y1 = shapeCy + 55;
        const x2 = shapeCx - 80;
        const y2 = shapeCy - 60;
        newStrokes.push({
          id: `stroke-shape-${now}-1`,
          shapeId,
          shapeType: type,
          points: [
            { x: x0, y: y0, timestamp: now },
            { x: x1, y: y1, timestamp: now + 5 },
            { x: x2, y: y2, timestamp: now + 10 },
            { x: x0, y: y0, timestamp: now + 15 },
          ],
          tool: 'pen',
          color: penColor,
          width: penWidth,
          timestamp: now,
        });
        const sq = 16;
        newStrokes.push({
          id: `stroke-shape-${now}-2`,
          shapeId,
          shapeType: type,
          points: [
            { x: x0, y: y0 - sq, timestamp: now + 20 },
            { x: x0 + sq, y: y0 - sq, timestamp: now + 25 },
            { x: x0 + sq, y: y0, timestamp: now + 30 },
          ],
          tool: 'pen',
          color: penColor,
          width: penWidth,
          timestamp: now + 20,
        });
      } else if (type === 'triangle') {
        newStrokes.push({
          id: `stroke-shape-${now}-1`,
          shapeId,
          shapeType: type,
          points: [
            { x: shapeCx, y: shapeCy - 65, timestamp: now },
            { x: shapeCx + 75, y: shapeCy + 65, timestamp: now + 5 },
            { x: shapeCx - 75, y: shapeCy + 65, timestamp: now + 10 },
            { x: shapeCx, y: shapeCy - 65, timestamp: now + 15 },
          ],
          tool: 'pen',
          color: penColor,
          width: penWidth,
          timestamp: now,
        });
      } else if (type === 'square') {
        const half = 55;
        newStrokes.push({
          id: `stroke-shape-${now}-1`,
          shapeId,
          shapeType: type,
          points: [
            { x: shapeCx - half, y: shapeCy - half, timestamp: now },
            { x: shapeCx + half, y: shapeCy - half, timestamp: now + 5 },
            { x: shapeCx + half, y: shapeCy + half, timestamp: now + 10 },
            { x: shapeCx - half, y: shapeCy + half, timestamp: now + 15 },
            { x: shapeCx - half, y: shapeCy - half, timestamp: now + 20 },
          ],
          tool: 'pen',
          color: penColor,
          width: penWidth,
          timestamp: now,
        });
      } else if (type === 'rectangle') {
        const hw = 85;
        const hh = 50;
        newStrokes.push({
          id: `stroke-shape-${now}-1`,
          shapeId,
          shapeType: type,
          points: [
            { x: shapeCx - hw, y: shapeCy - hh, timestamp: now },
            { x: shapeCx + hw, y: shapeCy - hh, timestamp: now + 5 },
            { x: shapeCx + hw, y: shapeCy + hh, timestamp: now + 10 },
            { x: shapeCx - hw, y: shapeCy + hh, timestamp: now + 15 },
            { x: shapeCx - hw, y: shapeCy - hh, timestamp: now + 20 },
          ],
          tool: 'pen',
          color: penColor,
          width: penWidth,
          timestamp: now,
        });
      } else if (type === 'circle') {
        const r = 60;
        const count = 48;
        const pts = [];
        for (let i = 0; i <= count; i++) {
          const a = (i * 2 * Math.PI) / count;
          pts.push({
            x: Math.round(shapeCx + r * Math.cos(a)),
            y: Math.round(shapeCy + r * Math.sin(a)),
            timestamp: now + i * 2,
          });
        }
        newStrokes.push({
          id: `stroke-shape-${now}-1`,
          shapeId,
          shapeType: type,
          points: pts,
          tool: 'pen',
          color: penColor,
          width: penWidth,
          timestamp: now,
        });
      }

      onStrokesChange([...strokes, ...newStrokes]);
      setSelectedShapeId(shapeId);
      onToolChange('select');
    },
    [containerSize, penColor, penWidth, strokes, onStrokesChange, onToolChange]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div ref={canvasContainerRef} className="canvas-container" tabIndex={0}>
      <div className="canvas-toolbar" role="toolbar" aria-label="Drawing tools">
        <button
          type="button"
          className={`toolbar-btn ${tool === 'pen' ? 'active' : ''}`}
          onClick={() => {
            onToolChange('pen');
            setSelectedShapeId(null);
          }}
          aria-pressed={tool === 'pen'}
          disabled={disabled}
          title="Pen (P)"
          aria-label="Pen tool"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </button>

        <button
          type="button"
          className={`toolbar-btn ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => {
            onToolChange('eraser');
            setSelectedShapeId(null);
          }}
          aria-pressed={tool === 'eraser'}
          disabled={disabled}
          title="Eraser (E)"
          aria-label="Eraser tool"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 20H7" />
            <path d="M16 3.5a2.5 2.5 0 0 1 0 5" />
            <path d="M10 2.5 4 8.5" />
            <path d="M8 16.5 4 20.5" />
            <path d="M18 7 14 11" />
            <path d="M14 11 10 15" />
            <path d="M10 15 6 19" />
          </svg>
        </button>

        <button
          type="button"
          className={`toolbar-btn ${tool === 'select' ? 'active' : ''}`}
          onClick={() => onToolChange(tool === 'select' ? 'pen' : 'select')}
          aria-pressed={tool === 'select'}
          disabled={disabled}
          title="Move / Select Shape or Drawing (M)"
          aria-label="Move tool"
          style={{ fontSize: '15px' }}
        >
          ✋
        </button>

        <div className="toolbar-divider" role="separator" />

        <div className="shape-picker-container" ref={shapeMenuRef}>
          <button
            type="button"
            className={`toolbar-btn shape-dropdown-btn ${isShapeMenuOpen ? 'active' : ''}`}
            onClick={() => setIsShapeMenuOpen((prev) => !prev)}
            disabled={disabled}
            title="Insert Geometric Shape"
            aria-label="Insert default geometric shape"
            aria-haspopup="true"
            aria-expanded={isShapeMenuOpen}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 3 2 21 22 21" />
            </svg>
            <span className="shape-btn-text">Shapes ▾</span>
          </button>
          {isShapeMenuOpen && (
            <div className="shape-dropdown-menu" role="menu" aria-label="Available geometric shapes">
              <button
                type="button"
                className="shape-menu-item"
                role="menuitem"
                onClick={() => insertShape('right_triangle')}
              >
                <span className="shape-menu-icon">📐</span>
                <span className="shape-menu-text">Right Triangle (90°)</span>
              </button>
              <button
                type="button"
                className="shape-menu-item"
                role="menuitem"
                onClick={() => insertShape('triangle')}
              >
                <span className="shape-menu-icon">🔺</span>
                <span className="shape-menu-text">Triangle</span>
              </button>
              <button
                type="button"
                className="shape-menu-item"
                role="menuitem"
                onClick={() => insertShape('square')}
              >
                <span className="shape-menu-icon">⬜</span>
                <span className="shape-menu-text">Square</span>
              </button>
              <button
                type="button"
                className="shape-menu-item"
                role="menuitem"
                onClick={() => insertShape('rectangle')}
              >
                <span className="shape-menu-icon">▭</span>
                <span className="shape-menu-text">Rectangle</span>
              </button>
              <button
                type="button"
                className="shape-menu-item"
                role="menuitem"
                onClick={() => insertShape('circle')}
              >
                <span className="shape-menu-icon">⭕</span>
                <span className="shape-menu-text">Circle</span>
              </button>
            </div>
          )}
        </div>

        {selectedShapeId && tool === 'select' && (
          <button
            type="button"
            className="toolbar-btn shape-delete-btn"
            onClick={deleteSelectedShape}
            title="Delete Selected Shape"
          >
            Delete Shape
          </button>
        )}

        <div className="toolbar-divider" role="separator" />

        <button
          type="button"
          className="toolbar-btn"
          onClick={onUndo}
          disabled={disabled || !canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={onRedo}
          disabled={disabled || !canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
          </svg>
        </button>

        <div className="toolbar-divider" role="separator" />

        <button
          type="button"
          className="toolbar-btn"
          onClick={onClear}
          disabled={disabled || strokes.length === 0}
          title="Clear canvas"
          aria-label="Clear canvas"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>

        <div className="canvas-status">
          <span className="stroke-count" data-testid="stroke-count">
            {strokes.length} stroke{strokes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="math-canvas"
        aria-label="Math writing canvas"
        role="application"
        style={{
          cursor:
            tool === 'select'
              ? isDraggingShape
                ? 'grabbing'
                : hoveredShapeId
                  ? 'grab'
                  : 'default'
              : tool === 'eraser'
                ? 'cell'
                : 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}

