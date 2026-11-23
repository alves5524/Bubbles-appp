import React, { useEffect, useRef, useState } from 'react';
import { evaluateAnimatedBubbles } from '../engine/bubbleGenerator';
import { generateSvgPath, getSerigraphyGrainCanvas } from '../engine/exporter';
import { BubbleNode, BubbleOffset, BubbleParams, getArtboardDimensions } from '../types/bubbles';

interface ArtboardCanvasProps {
  baseNodes: BubbleNode[];
  params: BubbleParams;
  manualOffsets: Record<number, BubbleOffset>;
  onUpdateOffset: (id: number, offset: BubbleOffset) => void;
  evaluatedNodesRef: React.MutableRefObject<BubbleNode[]>;
}

export const ArtboardCanvas: React.FC<ArtboardCanvasProps> = ({
  baseNodes,
  params,
  manualOffsets,
  onUpdateOffset,
  evaluatedNodesRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  const [hoveredBubbleId, setHoveredBubbleId] = useState<number | null>(null);
  const dragStateRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    origDx: number;
    origDy: number;
  } | null>(null);

  const { width: artW, height: artH } = getArtboardDimensions(params.aspectRatio);

  // Latest state refs for rAF loop without re-subscribing
  const stateRef = useRef({ baseNodes, params, manualOffsets, hoveredBubbleId });
  stateRef.current = { baseNodes, params, manualOffsets, hoveredBubbleId };

  const renderFrame = (cyclePhase: number, gridRes: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { baseNodes: nodes, params: p, manualOffsets: offsets, hoveredBubbleId: hoveredId } = stateRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(artW * dpr);
    const targetH = Math.round(artH * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const evaluated = evaluateAnimatedBubbles(nodes, p, cyclePhase, offsets);
    evaluatedNodesRef.current = evaluated;

    const pathData = generateSvgPath(evaluated, p, gridRes);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, artW, artH);

    // Surface background
    if (p.surfaceColor !== 'transparent') {
      ctx.fillStyle = p.surfaceColor;
      ctx.fillRect(0, 0, artW, artH);
    }

    // Ink-bleed compound vector shape
    if (pathData) {
      const p2d = new Path2D(pathData);
      ctx.fillStyle = p.lineColor;
      ctx.fill(p2d, 'evenodd');
    }

    // Subtle serigraphy surface texture
    if (p.surfaceGrain > 0 && p.surfaceColor !== 'transparent') {
      const pattern = ctx.createPattern(getSerigraphyGrainCanvas(), 'repeat');
      if (pattern) {
        ctx.globalAlpha = (p.surfaceGrain / 100) * 0.22;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, artW, artH);
        ctx.globalAlpha = 1;
      }
    }

    // Whisper-quiet guide ring when hovering or dragging a bubble
    const activeId = dragStateRef.current?.id ?? hoveredId;
    if (activeId !== null) {
      const target = evaluated.find((n) => n.id === activeId);
      if (target) {
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 113, 227, 0.48)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(target.x, target.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0071E3';
        ctx.fill();
      }
    }

    ctx.restore();
  };

  // Render static or animate continuously in seamless cycle
  useEffect(() => {
    if (!params.animationEnabled) {
      lastTimeRef.current = null;
      renderFrame(phaseRef.current, 320);
      return;
    }

    let rafId = 0;
    const tick = (now: number) => {
      if (lastTimeRef.current !== null) {
        const dt = (now - lastTimeRef.current) / 1000;
        const duration = Math.max(1.5, stateRef.current.params.animationDuration);
        phaseRef.current = (phaseRef.current + dt / duration) % 1;
      }
      lastTimeRef.current = now;
      renderFrame(phaseRef.current, 230);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      lastTimeRef.current = null;
    };
  }, [
    params.animationEnabled,
    params.animationDuration,
    params.aspectRatio,
    artW,
    artH,
  ]);

  // Immediate high-precision re-render when static or dragging/changing params
  useEffect(() => {
    if (!params.animationEnabled) {
      renderFrame(phaseRef.current, 320);
    }
  });

  const toArtboardCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(1, rect.width)) * artW,
      y: ((clientY - rect.top) / Math.max(1, rect.height)) * artH,
    };
  };

  const findNearestBubble = (ax: number, ay: number): number | null => {
    const current = evaluatedNodesRef.current;
    let bestId: number | null = null;
    let bestDist = Infinity;

    // Prefer ring circumference hits first, then interior hits (smallest radius wins)
    for (let i = current.length - 1; i >= 0; i--) {
      const b = current[i];
      const d = Math.hypot(ax - b.x, ay - b.y);
      const ringDist = Math.abs(d - b.radius);
      if (ringDist < 16 && ringDist < bestDist) {
        bestDist = ringDist;
        bestId = b.id;
      }
    }

    if (bestId !== null) return bestId;

    let smallestR = Infinity;
    for (let i = 0; i < current.length; i++) {
      const b = current[i];
      const d = Math.hypot(ax - b.x, ay - b.y);
      if (d <= b.radius && b.radius < smallestR) {
        smallestR = b.radius;
        bestId = b.id;
      }
    }
    return bestId;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toArtboardCoords(e.clientX, e.clientY);
    const id = findNearestBubble(x, y);
    if (id === null) return;

    const existing = manualOffsets[id] ?? { dx: 0, dy: 0 };
    dragStateRef.current = {
      id,
      startX: x,
      startY: y,
      origDx: existing.dx,
      origDy: existing.dy,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toArtboardCoords(e.clientX, e.clientY);
    if (dragStateRef.current) {
      const { id, startX, startY, origDx, origDy } = dragStateRef.current;
      onUpdateOffset(id, {
        dx: origDx + (x - startX),
        dy: origDy + (y - startY),
      });
      return;
    }

    const hitId = findNearestBubble(x, y);
    if (hitId !== hoveredBubbleId) {
      setHoveredBubbleId(hitId);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStateRef.current) {
      dragStateRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const isTransparent = params.surfaceColor === 'transparent';

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl overflow-hidden shadow-[0_24px_64px_-16px_rgba(0,0,0,0.14),0_2px_10px_-2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06] transition-[aspect-ratio] duration-300 ${
        isTransparent ? 'checkerboard-surface' : ''
      }`}
      style={{
        aspectRatio: `${artW} / ${artH}`,
        height: params.aspectRatio === '16:9' ? 'auto' : 'min(100%, 660px)',
        width: params.aspectRatio === '16:9' ? 'min(100%, 860px)' : 'auto',
        maxWidth: '100%',
        maxHeight: '100%',
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          if (!dragStateRef.current) setHoveredBubbleId(null);
        }}
        className={`w-full h-full block touch-none ${
          dragStateRef.current ? 'cursor-grabbing' : hoveredBubbleId !== null ? 'cursor-grab' : 'cursor-default'
        }`}
      />
    </div>
  );
};
