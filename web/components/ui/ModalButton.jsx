'use client';
import { useUI } from '@/lib/store';

/**
 * Client button that opens a registered modal — lets server pages stay server
 * components while still having working actions.
 *   <ModalButton modal="contact" payload={{ name }} className="btn btn-primary">Contacter</ModalButton>
 * `as="div"` to render a non-button wrapper (e.g. clickable card).
 */
export function ModalButton({ modal, payload = {}, className = 'btn btn-primary', children, as = 'button', title, style }) {
  const open = useUI((s) => s.openModal);
  const Tag = as;
  return (
    <Tag className={className} title={title} style={style} onClick={() => open(modal, payload)}>
      {children}
    </Tag>
  );
}

export default ModalButton;
