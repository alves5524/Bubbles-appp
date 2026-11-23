import { BubbleNode, BubbleOffset, BubbleParams, getArtboardDimensions } from '../types/bubbles';

/**
 * Deterministic Mulberry32 PRNG
 */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates an organic, overlapping bubble cluster inspired by screenprinted fluid foam.
 * Uses seeded growth so every parameter change stays coherent around the same seed.
 */
export function generateBubbleCluster(params: BubbleParams): BubbleNode[] {
  const { width, height } = getArtboardDimensions(params.aspectRatio);
  const minDim = Math.min(width, height);
  const rng = createRng(params.seed);

  // Density (0..100) -> 6 to 34 bubbles
  const count = Math.round(6 + (params.density / 100) * 28);
  const variation = params.sizeVariation / 100; // 0..1

  // Base radius scales inversely slightly with density so dense clusters don't overflow
  const densityScale = 1 - (params.density / 100) * 0.24;
  const baseRadius = minDim * 0.115 * densityScale * params.scale;

  const nodes: BubbleNode[] = [];

  for (let i = 0; i < count; i++) {
    // Size distribution: 1-2 large hero bubbles, medium core, smaller satellites
    const progress = i / Math.max(1, count - 1);
    let sizeFactor = 1.0;

    if (i === 0) {
      sizeFactor = 1.0 + variation * (0.85 + rng() * 0.35);
    } else if (i === 1 && count > 5) {
      sizeFactor = 1.0 + variation * (0.55 + rng() * 0.45);
    } else if (progress < 0.45) {
      const spread = (rng() - 0.35) * 0.9;
      sizeFactor = 1.0 + variation * spread;
    } else {
      // Smaller satellite bubbles nestled into crevices & outer perimeter
      const smallBias = -0.3 - rng() * 0.48;
      sizeFactor = Math.max(0.28, 1.0 + variation * smallBias);
    }

    const radius = Math.max(minDim * 0.028, baseRadius * sizeFactor);

    // Organic harmonic coefficients for subtle fluid asymmetry
    const deformAmp2 = (rng() * 0.09 + 0.02) * (rng() < 0.5 ? 1 : -1);
    const deformPhase2 = rng() * Math.PI * 2;
    const deformAmp3 = (rng() * 0.055 + 0.01) * (rng() < 0.5 ? 1 : -1);
    const deformPhase3 = rng() * Math.PI * 2;

    if (i === 0) {
      nodes.push({
        id: i,
        x: (rng() - 0.5) * minDim * 0.06,
        y: (rng() - 0.5) * minDim * 0.08,
        radius,
        phase: rng() * Math.PI * 2,
        orbitAngle: rng() * Math.PI * 2,
        deformAmp2,
        deformPhase2,
        deformAmp3,
        deformPhase3,
        distFromCenter: 0,
      });
      continue;
    }

    // Candidate placement around an existing bubble
    let bestX = 0;
    let bestY = 0;
    let bestScore = -Infinity;

    const candidates = 16;
    const aspectStretchX = width / minDim;
    const aspectStretchY = height / minDim;

    for (let c = 0; c < candidates; c++) {
      // Bias parent selection toward earlier/core bubbles for natural clustering
      const parentIdx = Math.floor(Math.pow(rng(), 1.25) * nodes.length);
      const parent = nodes[parentIdx];

      const angle = rng() * Math.PI * 2;
      // Overlap factor: mix of overlapping intersections (0.52..0.88) and near-kissing gaps (0.94..1.09)
      const isKissing = rng() < 0.32;
      const tightness = 1 - (params.density / 100) * 0.14;
      const overlapDist = isKissing
        ? (parent.radius + radius) * (0.95 + rng() * 0.14) * tightness
        : (parent.radius + radius) * (0.54 + rng() * 0.34) * tightness;

      const cx = parent.x + Math.cos(angle) * overlapDist * (0.85 + 0.25 * aspectStretchX);
      const cy = parent.y + Math.sin(angle) * overlapDist * (0.85 + 0.25 * aspectStretchY);

      // Score candidate: avoid concentric overlap (center inside another center) & encourage cohesive cluster
      let minCenterDistRatio = Infinity;
      let overlapCount = 0;

      for (let j = 0; j < nodes.length; j++) {
        const other = nodes[j];
        const dx = cx - other.x;
        const dy = cy - other.y;
        const d = Math.hypot(dx, dy);
        const sumR = radius + other.radius;
        const minR = Math.min(radius, other.radius);

        // Penalize being completely swallowed inside another bubble
        const ratio = d / Math.max(1, Math.abs(other.radius - radius) + minR * 0.45);
        if (ratio < minCenterDistRatio) minCenterDistRatio = ratio;
        if (d < sumR * 0.85) overlapCount++;
      }

      // Distance from origin (keeps cluster coherent instead of sprawling infinitely)
      const distOrigin = Math.hypot(cx / aspectStretchX, cy / aspectStretchY);

      let score = -distOrigin * 0.45;
      if (minCenterDistRatio < 0.72) {
        score -= (0.72 - minCenterDistRatio) * 420;
      }
      if (overlapCount > 3) {
        score -= (overlapCount - 3) * 65;
      }
      // Slight preference for organic vertical-balanced silhouette on portrait/square, horizontal on 16:9
      const targetAspectBias = width > height ? Math.abs(cy) * 0.25 : Math.abs(cx) * 0.18;
      score -= targetAspectBias;

      if (score > bestScore) {
        bestScore = score;
        bestX = cx;
        bestY = cy;
      }
    }

    nodes.push({
      id: i,
      x: bestX,
      y: bestY,
      radius,
      phase: rng() * Math.PI * 2,
      orbitAngle: rng() * Math.PI * 2,
      deformAmp2,
      deformPhase2,
      deformAmp3,
      deformPhase3,
      distFromCenter: 0,
    });
  }

  // Compute bounding box of cluster to center it neatly in the artboard with generous breathing room
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    if (n.x - n.radius < minX) minX = n.x - n.radius;
    if (n.x + n.radius > maxX) maxX = n.x + n.radius;
    if (n.y - n.radius < minY) minY = n.y - n.radius;
    if (n.y + n.radius > maxY) maxY = n.y + n.radius;
  }

  const clusterW = Math.max(1, maxX - minX);
  const clusterH = Math.max(1, maxY - minY);
  const clusterCenterX = (minX + maxX) * 0.5;
  const clusterCenterY = (minY + maxY) * 0.5;

  // Fit comfortably inside artboard (72% fill when scale=1.0 for Apple-level whitespace breathing room)
  const targetFit = 0.72 * params.scale;
  const fitScale = Math.min((width * targetFit) / clusterW, (height * targetFit) / clusterH, 1.35 * params.scale);

  const artCenterX = width * 0.5;
  const artCenterY = height * 0.5;

  return nodes.map((n) => {
    const x = artCenterX + (n.x - clusterCenterX) * fitScale;
    const y = artCenterY + (n.y - clusterCenterY) * fitScale;
    const radius = n.radius * fitScale;
    const distFromCenter = Math.hypot(x - artCenterX, y - artCenterY);
    return {
      ...n,
      x,
      y,
      radius,
      distFromCenter,
    };
  });
}

/**
 * Evaluates seamless cyclic animation at normalized phase t in [0, 1).
 * Guaranteed periodic: state(t=0) === state(t=1).
 */
export function evaluateAnimatedBubbles(
  nodes: BubbleNode[],
  params: BubbleParams,
  cyclePhase: number,
  manualOffsets: Record<number, BubbleOffset>
): BubbleNode[] {
  const twoPiT = cyclePhase * Math.PI * 2;
  const ampNorm = params.animationEnabled ? params.animationAmplitude / 100 : 0;
  const minDim = Math.min(
    getArtboardDimensions(params.aspectRatio).width,
    getArtboardDimensions(params.aspectRatio).height
  );

  return nodes.map((n) => {
    const offset = manualOffsets[n.id];
    const baseX = n.x + (offset ? offset.dx : 0);
    const baseY = n.y + (offset ? offset.dy : 0);

    if (!params.animationEnabled || ampNorm === 0) {
      return { ...n, x: baseX, y: baseY };
    }

    let dx = 0;
    let dy = 0;
    let radiusScale = 1;
    let phaseShift2 = 0;
    let phaseShift3 = 0;

    if (params.animationStyle === 'breathing') {
      // Gentle expansion/contraction + subtle organic wobble
      const wave = Math.sin(twoPiT + n.phase);
      const drift = Math.cos(twoPiT + n.orbitAngle);
      radiusScale = 1 + wave * 0.085 * ampNorm;
      dx = drift * minDim * 0.014 * ampNorm;
      dy = Math.sin(twoPiT + n.orbitAngle) * minDim * 0.014 * ampNorm;
      phaseShift2 = Math.sin(twoPiT + n.phase) * 0.35 * ampNorm;
    } else if (params.animationStyle === 'drift') {
      // Smooth periodic elliptical orbit so junctions softly bridge and release
      const orbitR = minDim * 0.032 * ampNorm;
      dx = Math.cos(twoPiT + n.orbitAngle) * orbitR;
      dy = Math.sin(twoPiT + n.orbitAngle) * orbitR * 0.78;
      radiusScale = 1 + Math.sin(twoPiT + n.phase) * 0.04 * ampNorm;
      phaseShift2 = Math.sin(twoPiT + n.phase * 0.5) * 0.4 * ampNorm;
    } else {
      // 'pulse': concentric wave traveling outward from cluster center
      const spatialDelay = (n.distFromCenter / Math.max(1, minDim * 0.35)) * Math.PI * 1.15;
      const wave = Math.sin(twoPiT - spatialDelay);
      radiusScale = 1 + wave * 0.11 * ampNorm;
      const push = Math.cos(twoPiT - spatialDelay) * minDim * 0.016 * ampNorm;
      const dirX = n.distFromCenter > 1 ? (n.x - getArtboardDimensions(params.aspectRatio).width * 0.5) / n.distFromCenter : 0;
      const dirY = n.distFromCenter > 1 ? (n.y - getArtboardDimensions(params.aspectRatio).height * 0.5) / n.distFromCenter : 0;
      dx = dirX * push;
      dy = dirY * push;
      phaseShift3 = Math.cos(twoPiT - spatialDelay) * 0.35 * ampNorm;
    }

    return {
      ...n,
      x: baseX + dx,
      y: baseY + dy,
      radius: Math.max(6, n.radius * radiusScale),
      deformPhase2: n.deformPhase2 + phaseShift2,
      deformPhase3: n.deformPhase3 + phaseShift3,
    };
  });
}
