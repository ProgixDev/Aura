// Minimal stroked icon set (Lucide-style) used across the site & admin.
// Usage: <Icon name="search" size={18} />
const PATHS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  pin: <><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  check: <path d="m4 12 5 5L20 6" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  x: <path d="M6 6 18 18M18 6 6 18" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  arrowRight: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  arrowLeft: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  heart: <path d="M12 20s-7-4.5-9.2-9C1.3 8 3 4.5 6.5 4.5c2 0 3.5 1.5 5.5 3.5 2-2 3.5-3.5 5.5-3.5C21 4.5 22.7 8 21.2 11 19 15.5 12 20 12 20Z" />,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-1.5 4L16 12H5" /></>,
  share: <><circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="17" cy="18" r="2.5" /><path d="m8.2 11 6.6-3.6M8.2 13l6.6 3.6" /></>,
  home: <><path d="M4 11 12 4l8 7" /><path d="M6 10v10h12V10" /></>,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M9 3v4M15 3v4" /></>,
  message: <path d="M5 5h14v11H9l-4 3V5Z" />,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-3.5 4-5 7-5s6 1.5 7 5" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c1-3 3.5-4.5 6-4.5S14 17 15 20" /><path d="M16 5.5a3 3 0 0 1 0 5.6M17 20c-.3-1.6-1-3-2-4" /></>,
  star: <path d="m12 4 2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.2 6.9 19l1.2-5.6L4 9.6 9.6 9 12 4Z" />,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  chart: <><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-3M12 16V8M16 16v-6" /></>,
  card: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></>,
  shield: <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />,
  filter: <path d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  edit: <><path d="m5 19 1-4L16 5l3 3L9 18l-4 1Z" /></>,
  trash: <><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" /></>,
  more: <><circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" /></>,
  download: <><path d="M12 4v11M8 11l4 4 4-4" /><path d="M5 19h14" /></>,
  logout: <><path d="M14 4h4v16h-4" /><path d="M3 12h11M9 8l-5 4 5 4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
  sparkle: <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />,
  euro: <><path d="M15 6a6 6 0 1 0 0 12" /><path d="M4 10h8M4 14h8" /></>,
  ticket: <><path d="M4 7h16v4a2 2 0 0 0 0 4v2H4v-2a2 2 0 0 0 0-4V7Z" /></>,
  tag: <><path d="M4 4h7l9 9-7 7-9-9V4Z" /><circle cx="8" cy="8" r="1.2" /></>,
  book: <><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" /><path d="M5 16h13" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
};

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.7, style }) {
  const p = PATHS[name];
  if (!p) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      {p}
    </svg>
  );
}

export default Icon;
