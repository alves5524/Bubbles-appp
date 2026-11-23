import React from 'react';
import {
  AnimationStyle,
  BubbleParams,
  LINE_SWATCHES,
  SURFACE_SWATCHES,
} from '../types/bubbles';
import { StudioSlider } from './StudioSlider';

interface InspectorPanelProps {
  params: BubbleParams;
  onChange: <K extends keyof BubbleParams>(key: K, value: BubbleParams[K]) => void;
}

const ANIMATION_STYLES: { id: AnimationStyle; label: string }[] = [
  { id: 'breathing', label: 'Respiração' },
  { id: 'drift', label: 'Deriva' },
  { id: 'pulse', label: 'Pulso' },
];

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ params, onChange }) => {
  return (
    <aside
      aria-label="Painel de controle"
      className="w-full lg:w-[336px] xl:w-[356px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-black/[0.06] overflow-y-auto studio-scroll"
    >
      <div className="divide-y divide-black/[0.06]">
        {/* Section 1: Bolhas & Composição */}
        <section className="px-6 py-5 space-y-4">
          <h2 className="text-[12px] font-semibold text-[#86868B] tracking-[0.01em]">
            Composição
          </h2>
          <div className="space-y-4">
            <StudioSlider
              id="slider-density"
              label="Densidade das bolhas"
              value={params.density}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => onChange('density', v)}
            />
            <StudioSlider
              id="slider-variation"
              label="Variação de tamanho"
              value={params.sizeVariation}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => onChange('sizeVariation', v)}
            />
            <StudioSlider
              id="slider-scale"
              label="Escala do conjunto"
              value={Math.round(params.scale * 100)}
              min={55}
              max={145}
              step={1}
              unit="%"
              onChange={(v) => onChange('scale', v / 100)}
            />
            <StudioSlider
              id="slider-organicness"
              label="Fluidez orgânica"
              value={params.organicness}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => onChange('organicness', v)}
            />
          </div>
        </section>

        {/* Section 2: Serigrafia & Ink Bleed */}
        <section className="px-6 py-5 space-y-4">
          <h2 className="text-[12px] font-semibold text-[#86868B] tracking-[0.01em]">
            Serigrafia e Junções
          </h2>
          <div className="space-y-4">
            <StudioSlider
              id="slider-inkbleed"
              label="Quantidade de ink bleed"
              value={params.inkBleed}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => onChange('inkBleed', v)}
            />
            <StudioSlider
              id="slider-roundness"
              label="Bordas arredondadas"
              value={params.roundness}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => onChange('roundness', v)}
            />
            <StudioSlider
              id="slider-stroke"
              label="Espessura da linha"
              value={params.strokeWidth}
              min={1.5}
              max={16}
              step={0.5}
              displayValue={`${params.strokeWidth.toFixed(1)} px`}
              onChange={(v) => onChange('strokeWidth', v)}
            />
            <StudioSlider
              id="slider-grain"
              label="Textura da superfície"
              value={params.surfaceGrain}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => onChange('surfaceGrain', v)}
            />
          </div>
        </section>

        {/* Section 3: Cor da Linha e Superfície */}
        <section className="px-6 py-5 space-y-5">
          <h2 className="text-[12px] font-semibold text-[#86868B] tracking-[0.01em]">
            Cor e Superfície
          </h2>

          {/* Line Color */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#1D1D1F]">Cor da linha</span>
              <span className="text-[12px] font-mono-tabular text-[#6E6E73] uppercase">
                {params.lineColor}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              {LINE_SWATCHES.map((swatch) => {
                const active = params.lineColor.toLowerCase() === swatch.value.toLowerCase();
                return (
                  <button
                    key={swatch.value}
                    type="button"
                    title={swatch.label}
                    aria-label={`Cor da linha: ${swatch.label}`}
                    onClick={() => onChange('lineColor', swatch.value)}
                    className={`w-7 h-7 rounded-full border border-black/15 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2 ${
                      active ? 'ring-2 ring-[#1D1D1F] ring-offset-2 scale-105' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.value }}
                  />
                );
              })}

              <label
                className="relative w-7 h-7 rounded-full border border-black/15 overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-150 flex items-center justify-center bg-[conic-gradient(from_0deg,#ff3b30,#ffcc00,#34c759,#007aff,#af52de,#ff3b30)]"
                title="Cor personalizada da linha"
              >
                <input
                  type="color"
                  aria-label="Escolher cor personalizada da linha"
                  value={params.lineColor}
                  onChange={(e) => onChange('lineColor', e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Surface Color */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#1D1D1F]">Superfície</span>
              <span className="text-[12px] font-mono-tabular text-[#6E6E73] uppercase">
                {params.surfaceColor === 'transparent' ? 'Transparente' : params.surfaceColor}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              {SURFACE_SWATCHES.map((swatch) => {
                const active = params.surfaceColor.toLowerCase() === swatch.value.toLowerCase();
                const isTrans = swatch.value === 'transparent';
                return (
                  <button
                    key={swatch.value}
                    type="button"
                    title={swatch.label}
                    aria-label={`Superfície: ${swatch.label}`}
                    onClick={() => onChange('surfaceColor', swatch.value)}
                    className={`w-7 h-7 rounded-full border border-black/15 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2 ${
                      isTrans ? 'checkerboard-surface' : ''
                    } ${active ? 'ring-2 ring-[#1D1D1F] ring-offset-2 scale-105' : 'hover:scale-105'}`}
                    style={!isTrans ? { backgroundColor: swatch.value } : undefined}
                  />
                );
              })}

              <label
                className="relative w-7 h-7 rounded-full border border-black/15 overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-150 flex items-center justify-center bg-[conic-gradient(from_0deg,#ff3b30,#ffcc00,#34c759,#007aff,#af52de,#ff3b30)]"
                title="Cor personalizada da superfície"
              >
                <input
                  type="color"
                  aria-label="Escolher cor personalizada da superfície"
                  value={params.surfaceColor === 'transparent' ? '#FFFFFF' : params.surfaceColor}
                  onChange={(e) => onChange('surfaceColor', e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Section 4: Animação Cíclica Suave */}
        <section className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[13px] font-medium text-[#1D1D1F]">Animação cíclica</h2>
              <p className="text-[12px] text-[#86868B] mt-0.5">
                Loop contínuo suave das junções
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={params.animationEnabled}
              aria-label="Ativar animação cíclica suave"
              onClick={() => onChange('animationEnabled', !params.animationEnabled)}
              className={`relative inline-flex h-[24px] w-[42px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2 ${
                params.animationEnabled ? 'bg-[#1D1D1F]' : 'bg-black/[0.14]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-out ${
                  params.animationEnabled ? 'translate-x-[18px]' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {params.animationEnabled && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#F5F5F7] rounded-lg">
                {ANIMATION_STYLES.map((style) => {
                  const active = params.animationStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => onChange('animationStyle', style.id)}
                      className={`py-1.5 px-2 text-[12px] font-medium rounded-md transition-all duration-150 whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                          : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                      }`}
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>

              <StudioSlider
                id="slider-anim-duration"
                label="Duração do ciclo"
                value={params.animationDuration}
                min={2}
                max={14}
                step={0.5}
                displayValue={`${params.animationDuration.toFixed(1)} s`}
                onChange={(v) => onChange('animationDuration', v)}
              />

              <StudioSlider
                id="slider-anim-amp"
                label="Amplitude do movimento"
                value={params.animationAmplitude}
                min={10}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => onChange('animationAmplitude', v)}
              />
            </div>
          )}
        </section>
      </div>
    </aside>
  );
};
