export function Badge({ children, variant = 'neutral', dot = false, className = '' }) {
  return (
    <span className={`badge ${variant} ${className}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export default Badge;
