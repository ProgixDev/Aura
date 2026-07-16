export const decimalTransformer = {
  to: (v?: number | string | null) => v,
  from: (v: string | number | null): number | null =>
    v === null ? null : Number(v),
};

// Entities declare json-ish columns as type 'text' + this transformer so the same
// entity works on Postgres (real jsonb column, pg auto-parses into objects) and SQLite.
export const jsonTransformer = {
  to: (v: unknown) => (v == null ? null : JSON.stringify(v)),
  from: (v: unknown): unknown => {
    if (v == null) return null;
    if (typeof v === 'string') {
      try {
        return JSON.parse(v) as unknown;
      } catch {
        return v;
      }
    }
    return v;
  },
};
