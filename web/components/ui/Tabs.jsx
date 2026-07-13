'use client';
import { useState } from 'react';

/** Controlled-ish tab bar. tabs = [{key,label}]. Renders children(activeKey). */
export function Tabs({ tabs, initial, children }) {
  const [active, setActive] = useState(initial || tabs[0]?.key);
  return (
    <>
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`tab ${active === t.key ? 'active' : ''}`} onClick={() => setActive(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {typeof children === 'function' ? children(active) : children}
    </>
  );
}

export default Tabs;
