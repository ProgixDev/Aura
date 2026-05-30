import Link from 'next/link';

/** Admin content header: breadcrumbs, title, subtitle, right-aligned actions. */
export function PageHead({ title, subtitle, crumbs, actions }) {
  return (
    <div className="head">
      <div>
        {crumbs && (
          <div className="crumbs">
            {crumbs.map((c, i) => (
              <span key={i} className="row gap-2">
                {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
                {i < crumbs.length - 1 && <span className="sep">/</span>}
              </span>
            ))}
          </div>
        )}
        <h1 className="h-2">{title}</h1>
        {subtitle && <p className="small" style={{ marginTop: 4 }}>{subtitle}</p>}
      </div>
      {actions && <div className="row gap-2 wrap">{actions}</div>}
    </div>
  );
}

export default PageHead;
