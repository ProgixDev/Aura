'use client';
import { useEffect } from 'react';
import { useUI } from '@/lib/store';
import { MODAL_REGISTRY } from './registry';

/** Renders the modal stack from the global store. Mounted once in root layout. */
export default function ModalRoot() {
  const modals = useUI((s) => s.modals);

  useEffect(() => {
    document.body.style.overflow = modals.length ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modals.length]);

  if (!modals.length) return null;
  return (
    <>
      {modals.map((m) => {
        const render = MODAL_REGISTRY[m.name];
        if (!render) return null;
        return <div key={m.id}>{render({ id: m.id, ...m.props })}</div>;
      })}
    </>
  );
}
