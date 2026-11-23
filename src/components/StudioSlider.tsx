import React from 'react';

interface StudioSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  displayValue?: string;
  onChange: (value: number) => void;
}

export const StudioSlider: React.FC<StudioSliderProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  displayValue,
  onChange,
}) => {
  const pct = Math.max(0, Math.min(100, ((value - min) / Math.max(1e-6, max - min)) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[13px] font-medium text-[#1D1D1F] tracking-[-0.005em] select-none"
        >
          {label}
        </label>
        <span className="text-[12px] font-mono-tabular text-[#6E6E73] select-none">
          {displayValue ?? `${value}${unit}`}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ '--slider-pct': `${pct}%` } as React.CSSProperties}
        className="studio-slider block"
      />
    </div>
  );
};
