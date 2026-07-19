'use client';
import { useState } from 'react';
import { Icon } from './Icon';

// Password <input> with a show/hide toggle. Forwards all other props (value,
// onChange, autoComplete, required, placeholder, className…) to the input.
export function PasswordInput({ className = 'input', style, ...rest }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="row" style={{ position: 'relative', alignItems: 'center' }}>
      <input
        {...rest}
        type={visible ? 'text' : 'password'}
        className={className}
        style={{ paddingRight: 40, width: '100%', ...style }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        style={{
          position: 'absolute', right: 10, display: 'flex', alignItems: 'center',
          background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--muted, #8a8578)',
        }}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  );
}

export default PasswordInput;
