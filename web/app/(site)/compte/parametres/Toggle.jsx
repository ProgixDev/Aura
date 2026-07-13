'use client';
import { useState } from 'react';

export function Toggle({ defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`switch ${on ? 'on' : ''}`}
      onClick={() => setOn((v) => !v)}
    >
      <span className="knob" />
    </button>
  );
}

export default Toggle;
