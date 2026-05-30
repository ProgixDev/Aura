import { Icon } from './Icon';

export function StatCard({ label, value, delta, deltaDir = 'up', icon, hint }) {
  return (
    <div className="stat">
      <div className="between">
        <span className="label">{label}</span>
        {icon && <span className="tile-icon tint-violet" style={{ width: 34, height: 34 }}><Icon name={icon} size={17} color="var(--violet-2)" /></span>}
      </div>
      <div className="value">{value}</div>
      {delta != null && (
        <span className={`delta ${deltaDir}`}>
          <Icon name={deltaDir === 'up' ? 'arrowRight' : 'arrowRight'} size={12} style={{ transform: deltaDir === 'up' ? 'rotate(-45deg)' : 'rotate(45deg)' }} />
          {delta}
        </span>
      )}
      {hint && <div className="tiny" style={{ marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export default StatCard;
