'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';

/**
 * Admin data table with search, optional status filter, sorting and pagination.
 * Props:
 *  - columns: [{ key, label, render?(row), sortable?, width? }]
 *  - rows: array of objects
 *  - searchKeys: string[] of keys to match the search box against
 *  - filters: [{ key, label, options:[{value,label}] }]  (simple select filters)
 *  - rowHref?: (row) => string   makes rows clickable (navigates)
 *  - onRowClick?: (row) => void
 *  - pageSize (default 8), toolbar (extra node on the right)
 */
export function DataTable({ columns, rows, searchKeys = [], filters = [], rowHref, onRowClick, pageSize = 8, searchPlaceholder = 'Rechercher…', toolbar }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filterVals, setFilterVals] = useState({});
  const [sort, setSort] = useState(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let r = rows;
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((row) => searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(s)));
    }
    for (const f of filters) {
      const v = filterVals[f.key];
      if (v) r = r.filter((row) => String(row[f.key]) === v);
    }
    if (sort) {
      r = [...r].sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        const c = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sort.dir === 'asc' ? c : -c;
      });
    }
    return r;
  }, [rows, q, filterVals, sort, searchKeys, filters]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * pageSize, cur * pageSize);

  const go = (row) => {
    if (onRowClick) onRowClick(row);
    else if (rowHref) router.push(rowHref(row));
  };
  const toggleSort = (key) => setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <div className="input-search" style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span className="ic"><Icon name="search" size={17} /></span>
          <input className="input" placeholder={searchPlaceholder} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        {filters.map((f) => (
          <select key={f.key} className="input" style={{ width: 'auto', minWidth: 150 }}
            value={filterVals[f.key] || ''} onChange={(e) => { setFilterVals((v) => ({ ...v, [f.key]: e.target.value })); setPage(1); }}>
            <option value="">{f.label}</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {toolbar}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ width: c.width, cursor: c.sortable ? 'pointer' : 'default' }} onClick={c.sortable ? () => toggleSort(c.key) : undefined}>
                  {c.label}{sort?.key === c.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr><td colSpan={columns.length}><div className="empty"><div className="glyph">❍</div>Aucun résultat</div></td></tr>
            ) : slice.map((row, i) => (
              <tr key={row.id ?? i} className={rowHref || onRowClick ? 'clickable' : ''} onClick={(rowHref || onRowClick) ? () => go(row) : undefined}>
                {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-pagination">
        <span>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
        <div className="row gap-2">
          <button className="btn btn-soft btn-sm" disabled={cur <= 1} onClick={() => setPage(cur - 1)}><Icon name="chevronLeft" size={15} /></button>
          <span className="small">Page {cur} / {pages}</span>
          <button className="btn btn-soft btn-sm" disabled={cur >= pages} onClick={() => setPage(cur + 1)}><Icon name="chevronRight" size={15} /></button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
