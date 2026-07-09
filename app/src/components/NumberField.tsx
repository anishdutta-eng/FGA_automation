import { useEffect, useRef, useState } from 'react';

interface NumberFieldProps {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onCommit: (n: number) => void;
  className?: string;
  title?: string;
  ariaLabel?: string;
}

/**
 * A controlled number input that doesn't fight the user.
 *
 * The problem with a plain `<input type="number" value={n}>` plus clamping in
 * onChange is that React immediately re-renders with the clamped value, so you
 * can't clear the field or type multi-digit numbers — the value "snaps back".
 *
 * Fix (standard React pattern): keep the raw text in local state, commit parsed
 * values as the user types, allow an empty/intermediate state, and normalize +
 * clamp on blur. External value changes only sync in when the field isn't
 * focused.
 */
export function NumberField({
  value,
  min = 0,
  max,
  disabled,
  onCommit,
  className,
  title,
  ariaLabel,
}: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const clamp = (n: number) => {
    let v = n;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      disabled={disabled}
      value={text}
      min={min}
      max={max}
      title={title}
      aria-label={ariaLabel}
      className={className}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw === '') return; // allow empty while typing
        const n = Math.floor(Number(raw));
        if (Number.isNaN(n)) return;
        onCommit(clamp(n));
      }}
      onBlur={(e) => {
        focused.current = false;
        const raw = e.target.value;
        if (raw === '' || Number.isNaN(Number(raw))) {
          setText(String(value)); // revert to last good value
          return;
        }
        const n = clamp(Math.floor(Number(raw)));
        setText(String(n));
        onCommit(n);
      }}
    />
  );
}
