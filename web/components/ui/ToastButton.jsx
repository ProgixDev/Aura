'use client';
import { useState } from 'react';
import { useUI } from '@/lib/store';

/** Button that fires a toast (and optionally toggles an active/pressed state). */
export function ToastButton({ message = 'Fait', tone = 'success', toggle = false, activeMessage, className = 'btn btn-soft', children, activeChildren, style, title }) {
  const fire = useUI((s) => s.toast);
  const [on, setOn] = useState(false);
  const click = () => {
    if (toggle) {
      const next = !on; setOn(next);
      fire(next ? (activeMessage || message) : message, tone);
    } else {
      fire(message, tone);
    }
  };
  return (
    <button className={`${className} ${toggle && on ? 'is-active' : ''}`} style={style} title={title} onClick={click}>
      {toggle && on && activeChildren ? activeChildren : children}
    </button>
  );
}

export default ToastButton;
