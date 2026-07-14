// Generic client-side lookup used when a route's slug must be resolved
// against a small, already-fetched list (e.g. the full disciplines list).
export function findBySlug(list, slug) {
  return (list || []).find((item) => item.slug === slug);
}
