"use client";
import { useId, type ReactNode } from "react";
import { Check } from "lucide-react";

interface Choice<T extends string> {
  value: T;
  title: string;
  detail: string;
  icon?: ReactNode;
}

export function ChoiceCards<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly Choice<T>[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="choice-group">
      <legend>{label}</legend>
      <div className={`choice-cards choices-${options.length}`}>
        {options.map(option => (
          <label className="choice-card" key={option.value}>
            <input type="radio" name={name} value={option.value}
              checked={value === option.value} onChange={() => onChange(option.value)}
              aria-label={option.title} />
            <span className="choice-symbol" aria-hidden="true">{option.icon}</span>
            <span className="choice-copy"><strong>{option.title}</strong><small>{option.detail}</small></span>
            <span className="choice-selected" aria-hidden="true"><Check size={14}/></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TouchToggle({ title, detail, checked, onChange, disabled = false }: {
  title: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="touch-toggle">
      <input type="checkbox" checked={checked} disabled={disabled}
        onChange={e => onChange(e.target.checked)} aria-label={title} />
      <span className="toggle-copy"><strong>{title}</strong><small>{detail}</small></span>
      <span className="toggle-state" aria-hidden="true">{checked ? "On" : "Off"}</span>
      <span className="toggle-track" aria-hidden="true"><span><Check size={13}/></span></span>
    </label>
  );
}
