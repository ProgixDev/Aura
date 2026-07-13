import Link from 'next/link';

/**
 * Button — renders a Next <Link> when `href` is set, else a <button>.
 * variant: primary | aurora | ghost | soft | danger | danger-soft | link
 * size: sm | md | lg ; block for full width.
 */
export function Button({ children, href, variant = 'primary', size = 'md', block = false, className = '', ...rest }) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' && 'btn-sm',
    size === 'lg' && 'btn-lg',
    block && 'btn-block',
    className,
  ].filter(Boolean).join(' ');

  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export default Button;
