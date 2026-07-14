'use client';
import { useState } from 'react';

export function Toggle({ defaultOn = false, checked, onChange }) {
  const controlled = checked !== undefined;
  const [on, setOn] = useState(defaultOn);
  const value = controlled ? checked : on;

  const toggle = () => {
    const next = !value;
    if (!controlled) setOn(next);
    onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`switch ${value ? 'on' : ''}`}
      onClick={toggle}
    >
      <span className="knob" />
    </button>
  );
}

export default Toggle;
