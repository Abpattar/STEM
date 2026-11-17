import { useState, useCallback } from 'react';
import { DiagramData } from '../types';

export function useDiagram(initialData: DiagramData | null = null) {
  const [data, setData] = useState<DiagramData | null>(initialData);
  const [highlightedElements, setHighlightedElements] = useState<string[]>([]);

  const updateData = useCallback((newData: DiagramData | ((prev: DiagramData | null) => DiagramData)) => {
    setData(prev => typeof newData === 'function' ? newData(prev) : newData);
  }, []);

  const highlightElement = useCallback((elementId: string) => {
    setHighlightedElements(prev => [...prev, elementId]);
  }, []);

  const unhighlightElement = useCallback((elementId: string) => {
    setHighlightedElements(prev => prev.filter(id => id !== elementId));
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlightedElements([]);
  }, []);

  return {
    data,
    setData: updateData,
    highlightedElements,
    highlightElement,
    unhighlightElement,
    clearHighlights,
  };
}