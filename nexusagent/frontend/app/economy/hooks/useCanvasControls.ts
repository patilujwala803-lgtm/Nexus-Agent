import { useRef, useCallback, useEffect, useState } from 'react';

export function useCanvasControls() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const transformRef = useRef({ x: 100, y: 120, zoom: 0.85 });
  const isDraggingRef = useRef(false);
  const startMouseRef = useRef({ x: 0, y: 0 });
  const startTransformRef = useRef({ x: 100, y: 120 });

  const [zoomLevel, setZoomLevel] = useState(0.85);

  const applyTransform = useCallback(() => {
    const { x, y, zoom } = transformRef.current;
    if (canvasRef.current) {
      canvasRef.current.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
      canvasRef.current.style.transformOrigin = '0 0';
    }
    if (containerRef.current) {
      containerRef.current.style.backgroundSize = `${24 * zoom}px ${24 * zoom}px`;
      containerRef.current.style.backgroundPosition = `${x}px ${y}px`;
    }
  }, []);

  useEffect(() => {
    applyTransform();
  }, [applyTransform]);

  const setZoom = useCallback(
    (newZoom: number, mouseX?: number, mouseY?: number) => {
      const clampedZoom = Math.min(2.0, Math.max(0.3, newZoom));
      const oldZoom = transformRef.current.zoom;

      if (mouseX !== undefined && mouseY !== undefined && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const containerX = mouseX - rect.left;
        const containerY = mouseY - rect.top;

        // Zoom relative to mouse cursor
        const scaleChange = clampedZoom / oldZoom;
        const newX = containerX - (containerX - transformRef.current.x) * scaleChange;
        const newY = containerY - (containerY - transformRef.current.y) * scaleChange;

        transformRef.current = { x: newX, y: newY, zoom: clampedZoom };
      } else {
        transformRef.current = { ...transformRef.current, zoom: clampedZoom };
      }

      setZoomLevel(clampedZoom);
      applyTransform();
    },
    [applyTransform]
  );

  const zoomIn = useCallback(() => {
    setZoom(transformRef.current.zoom + 0.15);
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(transformRef.current.zoom - 0.15);
  }, [setZoom]);

  const resetView = useCallback(() => {
    transformRef.current = { x: 100, y: 120, zoom: 0.85 };
    setZoomLevel(0.85);
    applyTransform();
  }, [applyTransform]);

  const panTo = useCallback(
    (targetX: number, targetY: number) => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const currentZoom = transformRef.current.zoom;

      const newX = width / 2 - targetX * currentZoom;
      const newY = height / 2 - targetY * currentZoom;

      transformRef.current = { ...transformRef.current, x: newX, y: newY };
      applyTransform();
    },
    [applyTransform]
  );

  // Mouse wheel handler
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom(transformRef.current.zoom + delta, e.clientX, e.clientY);
    },
    [setZoom]
  );

  // Mouse drag pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    // Only drag if target is background or container or dot grid
    const target = e.target as HTMLElement;
    if (
      target.closest('.interactive-node') ||
      target.closest('.interactive-card') ||
      target.closest('.fixed-overlay')
    ) {
      return;
    }

    isDraggingRef.current = true;
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    startTransformRef.current = { x: transformRef.current.x, y: transformRef.current.y };
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - startMouseRef.current.x;
      const dy = e.clientY - startMouseRef.current.y;

      transformRef.current.x = startTransformRef.current.x + dx;
      transformRef.current.y = startTransformRef.current.y + dy;
      applyTransform();
    },
    [applyTransform]
  );

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab';
      }
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp]);

  return {
    containerRef,
    canvasRef,
    transformRef,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetView,
    panTo,
    handleMouseDown,
  };
}
