export type AspectRatio = '1:1' | '4:5' | '16:9';
export type AnimationStyle = 'breathing' | 'drift' | 'pulse';

export interface BubbleParams {
  seed: number;
  density: number; // 0 - 100
  sizeVariation: number; // 0 - 100
  scale: number; // 0.5 - 1.5
  organicness: number; // 0 - 100
  strokeWidth: number; // 1.5 - 16
  inkBleed: number; // 0 - 100
  roundness: number; // 0 - 100
  lineColor: string;
  surfaceColor: string; // hex or 'transparent'
  surfaceGrain: number; // 0 - 100
  aspectRatio: AspectRatio;
  animationEnabled: boolean;
  animationStyle: AnimationStyle;
  animationDuration: number; // seconds (2 - 14)
  animationAmplitude: number; // 0 - 100
}

export interface BubbleOffset {
  dx: number;
  dy: number;
}

export interface BubbleNode {
  id: number;
  x: number;
  y: number;
  radius: number;
  phase: number;
  orbitAngle: number;
  deformAmp2: number;
  deformPhase2: number;
  deformAmp3: number;
  deformPhase3: number;
  distFromCenter: number;
}

export interface StudioPreset {
  id: string;
  label: string;
  params: Partial<BubbleParams>;
}

export const DEFAULT_PARAMS: BubbleParams = {
  seed: 4219,
  density: 54,
  sizeVariation: 78,
  scale: 1.0,
  organicness: 24,
  strokeWidth: 4.5,
  inkBleed: 56,
  roundness: 68,
  lineColor: '#0A0A0B',
  surfaceColor: '#FFFFFF',
  surfaceGrain: 14,
  aspectRatio: '4:5',
  animationEnabled: false,
  animationStyle: 'breathing',
  animationDuration: 6.0,
  animationAmplitude: 45,
};

export const STUDIO_PRESETS: StudioPreset[] = [
  {
    id: 'serigrafia-papel',
    label: 'Papel',
    params: {
      seed: 4219,
      density: 54,
      sizeVariation: 78,
      scale: 1.0,
      organicness: 24,
      strokeWidth: 4.5,
      inkBleed: 56,
      roundness: 68,
      lineColor: '#0A0A0B',
      surfaceColor: '#FFFFFF',
      surfaceGrain: 14,
    },
  },
  {
    id: 'giz-preto',
    label: 'Noturno',
    params: {
      seed: 4219,
      density: 54,
      sizeVariation: 78,
      scale: 1.0,
      organicness: 24,
      strokeWidth: 4.5,
      inkBleed: 56,
      roundness: 68,
      lineColor: '#FFFFFF',
      surfaceColor: '#050505',
      surfaceGrain: 10,
    },
  },
  {
    id: 'espuma-densa',
    label: 'Espuma',
    params: {
      seed: 7831,
      density: 82,
      sizeVariation: 88,
      scale: 1.05,
      organicness: 36,
      strokeWidth: 3.6,
      inkBleed: 72,
      roundness: 82,
      lineColor: '#111827',
      surfaceColor: '#F2EFE9',
      surfaceGrain: 22,
    },
  },
  {
    id: 'cobalto-minimal',
    label: 'Cobalto',
    params: {
      seed: 1904,
      density: 32,
      sizeVariation: 64,
      scale: 1.08,
      organicness: 14,
      strokeWidth: 5.5,
      inkBleed: 44,
      roundness: 74,
      lineColor: '#1D4ED8',
      surfaceColor: '#F8FAFC',
      surfaceGrain: 12,
    },
  },
];

export const LINE_SWATCHES = [
  { label: 'Nanquim', value: '#0A0A0B' },
  { label: 'Giz', value: '#FFFFFF' },
  { label: 'Cobalto', value: '#1D4ED8' },
  { label: 'Vermilion', value: '#DC2626' },
  { label: 'Musgo', value: '#15803D' },
];

export const SURFACE_SWATCHES = [
  { label: 'Papel Puro', value: '#FFFFFF' },
  { label: 'Algodão', value: '#F2EFE9' },
  { label: 'Preto Fosco', value: '#050505' },
  { label: 'Ardósia', value: '#141416' },
  { label: 'Transparente', value: 'transparent' },
];

export function getArtboardDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case '1:1':
      return { width: 800, height: 800 };
    case '4:5':
      return { width: 720, height: 900 };
    case '16:9':
      return { width: 960, height: 540 };
  }
}
