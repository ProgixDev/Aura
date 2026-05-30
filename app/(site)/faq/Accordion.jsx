'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export function Accordion({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="stack" style={{ gap: 10 }}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} className="card-line" style={{ overflow: 'hidden' }}>
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="row between"
              style={{ width: '100%', padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}
            >
              <span className="h-4" style={{ fontWeight: 500 }}>{it.q}</span>
              <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
                <Icon name="chevronDown" size={18} color="var(--muted)" />
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 20px 20px' }}>
                <p className="body" style={{ color: 'var(--muted)' }}>{it.a}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
