import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Download,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import { ArtboardCanvas } from './components/ArtboardCanvas';
import { InspectorPanel } from './components/InspectorPanel';
import { generateBubbleCluster } from './engine/bubbleGenerator';
import { exportAsPng, exportAsSvg } from './engine/exporter';
import {
  AspectRatio,
  BubbleNode,
  BubbleOffset,
  BubbleParams,
  DEFAULT_PARAMS,
  STUDIO_PRESETS,
  StudioPreset,
} from './types/bubbles';

const ASPECT_OPTIONS: AspectRatio[] = ['1:1', '4:5', '16:9'];
const PNG_SCALES: (1 | 2 | 3)[] = [1, 2, 3];

export default function App() {
  const [params, setParams] = useState<BubbleParams>(DEFAULT_PARAMS);
  const [activePresetId, setActivePresetId] = useState<string>('serigrafia-papel');
  const [manualOffsets, setManualOffsets] = useState<Record<number, BubbleOffset>>({});
  const [pngScale, setPngScale] = useState<1 | 2 | 3>(2);
  const [exportStatus, setExportStatus] = useState<'idle' | 'svg' | 'png'>('idle');
  const [isExportingPng, setIsExportingPng] = useState(false);

  const evaluatedNodesRef = useRef<BubbleNode[]>([]);

  const baseNodes = useMemo(
    () => generateBubbleCluster(params),
    [params.seed, params.density, params.sizeVariation, params.scale, params.aspectRatio]
  );

  const handleParamChange = useCallback(
    <K extends keyof BubbleParams>(key: K, value: BubbleParams[K]) => {
      setActivePresetId('');
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSelectPreset = (preset: StudioPreset) => {
    setActivePresetId(preset.id);
    setManualOffsets({});
    setParams((prev) => ({
      ...prev,
      ...preset.params,
    }));
  };

  const handleShuffleSeed = () => {
    const nextSeed = Math.floor(1000 + Math.random() * 8999);
    setManualOffsets({});
    setActivePresetId('');
    setParams((prev) => ({ ...prev, seed: nextSeed }));
  };

  const handleInvertColors = () => {
    setActivePresetId('');
    setParams((prev) => {
      if (prev.surfaceColor === 'transparent') {
        const isDarkLine = prev.lineColor.toLowerCase() === '#0a0a0b' || prev.lineColor.toLowerCase() === '#000000';
        return { ...prev, lineColor: isDarkLine ? '#FFFFFF' : '#0A0A0B' };
      }
      return {
        ...prev,
        lineColor: prev.surfaceColor,
        surfaceColor: prev.lineColor,
      };
    });
  };

  const handleUpdateOffset = useCallback((id: number, offset: BubbleOffset) => {
    setManualOffsets((prev) => ({ ...prev, [id]: offset }));
  }, []);

  const handleResetOffsets = () => {
    setManualOffsets({});
  };

  const handleExportSvg = () => {
    const nodesToExport =
      evaluatedNodesRef.current.length === baseNodes.length
        ? evaluatedNodesRef.current
        : baseNodes;
    exportAsSvg(nodesToExport, params);
    setExportStatus('svg');
    setTimeout(() => setExportStatus('idle'), 1800);
  };

  const handleExportPng = async () => {
    if (isExportingPng) return;
    setIsExportingPng(true);
    try {
      const nodesToExport =
        evaluatedNodesRef.current.length === baseNodes.length
          ? evaluatedNodesRef.current
          : baseNodes;
      await exportAsPng(nodesToExport, params, pngScale);
      setExportStatus('png');
      setTimeout(() => setExportStatus('idle'), 1800);
    } finally {
      setIsExportingPng(false);
    }
  };

  const hasCustomOffsets = Object.keys(manualOffsets).length > 0;

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#F5F5F7] text-[#1D1D1F] lg:overflow-hidden">
      {/* Top Bar: 3-zone Apple minimal studio header */}
      <header className="h-14 shrink-0 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] px-6 flex items-center justify-between gap-8 z-20">
        {/* Zone 1: Single-line Brand Wordmark */}
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-[#1D1D1F] whitespace-nowrap shrink-0 select-none">
          Serigrafia
        </span>

        {/* Zone 2: Preset Switcher */}
        <nav
          aria-label="Predefinições visuais"
          className="hidden md:flex items-center gap-1 p-1 bg-[#F5F5F7] rounded-lg"
        >
          {STUDIO_PRESETS.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 py-1 text-[12.5px] font-medium rounded-md transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                  active
                    ? 'bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Export Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center bg-[#F5F5F7] rounded-lg p-0.5">
            {PNG_SCALES.map((scaleOpt) => (
              <button
                key={scaleOpt}
                type="button"
                onClick={() => setPngScale(scaleOpt)}
                title={`Resolução PNG ${scaleOpt}x`}
                className={`px-2 py-1 text-[11.5px] font-mono-tabular font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  pngScale === scaleOpt
                    ? 'bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.07)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {scaleOpt}×
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportPng}
            disabled={isExportingPng}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] bg-white border border-black/[0.1] rounded-lg hover:bg-[#F5F5F7] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]"
          >
            {exportStatus === 'png' ? (
              <Check className="w-3.5 h-3.5 text-[#16A34A]" />
            ) : (
              <Download className="w-3.5 h-3.5 text-[#6E6E73]" />
            )}
            <span>{exportStatus === 'png' ? 'PNG salvo' : 'Exportar PNG'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportSvg}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-medium text-white bg-[#1D1D1F] rounded-lg hover:bg-[#333336] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2"
          >
            {exportStatus === 'svg' ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Download className="w-3.5 h-3.5 text-white/80" />
            )}
            <span>{exportStatus === 'svg' ? 'SVG salvo' : 'Exportar SVG'}</span>
          </button>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left/Center Viewport with generous breathing room */}
        <main className="flex-1 flex flex-col items-center justify-between p-6 md:p-10 lg:p-12 min-w-0 min-h-[460px] lg:min-h-0">
          {/* Artboard Center */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 py-2">
            <ArtboardCanvas
              baseNodes={baseNodes}
              params={params}
              manualOffsets={manualOffsets}
              onUpdateOffset={handleUpdateOffset}
              evaluatedNodesRef={evaluatedNodesRef}
            />
          </div>

          {/* Minimal Floating-Style Studio Toolbar below Artboard */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 bg-white/90 backdrop-blur-md border border-black/[0.06] rounded-xl px-3 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <button
              type="button"
              onClick={handleShuffleSeed}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] rounded-lg hover:bg-[#F5F5F7] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#6E6E73]" />
              <span>Nova composição</span>
            </button>

            <span className="h-4 w-px bg-black/[0.08]" aria-hidden="true" />

            <button
              type="button"
              onClick={handleInvertColors}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium text-[#1D1D1F] rounded-lg hover:bg-[#F5F5F7] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#6E6E73]" />
              <span>Inverter cores</span>
            </button>

            <span className="h-4 w-px bg-black/[0.08]" aria-hidden="true" />

            <div className="flex items-center gap-0.5 bg-[#F5F5F7] p-0.5 rounded-lg" role="group" aria-label="Proporção da tela">
              {ASPECT_OPTIONS.map((ratio) => {
                const active = params.aspectRatio === ratio;
                return (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => handleParamChange('aspectRatio', ratio)}
                    className={`px-2 py-1 text-[11.5px] font-mono-tabular font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                        : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {ratio}
                  </button>
                );
              })}
            </div>

            <span className="h-4 w-px bg-black/[0.08]" aria-hidden="true" />

            <button
              type="button"
              onClick={() => handleParamChange('animationEnabled', !params.animationEnabled)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                params.animationEnabled
                  ? 'bg-[#1D1D1F] text-white'
                  : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
              }`}
            >
              {params.animationEnabled ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 text-[#6E6E73]" />
              )}
              <span>{params.animationEnabled ? 'Pausar ciclo' : 'Animar ciclo'}</span>
            </button>

            {hasCustomOffsets && (
              <>
                <span className="h-4 w-px bg-black/[0.08]" aria-hidden="true" />
                <button
                  type="button"
                  onClick={handleResetOffsets}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] rounded-lg hover:bg-[#F5F5F7] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Alinhar</span>
                </button>
              </>
            )}
          </div>
        </main>

        {/* Right Inspector Panel */}
        <InspectorPanel params={params} onChange={handleParamChange} />
      </div>
    </div>
  );
}
