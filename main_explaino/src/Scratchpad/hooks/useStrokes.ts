import { useState, useCallback } from 'react';
import type { Stroke } from '../types/canvas';

interface UseStrokesReturn {
  strokes: Stroke[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  addStroke: (stroke: Stroke) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  setStrokes: (strokes: Stroke[]) => void;
}

export function useStrokes(initialStrokes: Stroke[] = []): UseStrokesReturn {
  const [strokes, setStrokesState] = useState<Stroke[]>(initialStrokes);
  const [historyIndex, setHistoryIndex] = useState(initialStrokes.length);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < strokes.length;

  const addStroke = useCallback(
    (stroke: Stroke) => {
      setStrokesState((prev) => {
        const newStrokes = [...prev.slice(0, historyIndex), stroke];
        setHistoryIndex(newStrokes.length);
        return newStrokes;
      });
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
    }
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < strokes.length) {
      setHistoryIndex((prev) => prev + 1);
    }
  }, [historyIndex, strokes.length]);

  const clear = useCallback(() => {
    setStrokesState([]);
    setHistoryIndex(0);
  }, []);

  const setStrokes = useCallback((newStrokes: Stroke[]) => {
    setStrokesState(newStrokes);
    setHistoryIndex(newStrokes.length);
  }, []);

  const visibleStrokes = strokes.slice(0, historyIndex);

  return {
    strokes: visibleStrokes,
    historyIndex,
    canUndo,
    canRedo,
    addStroke,
    undo,
    redo,
    clear,
    setStrokes,
  };
}

