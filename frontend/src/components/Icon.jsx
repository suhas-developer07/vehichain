const ICONS = {
  shield: <path d="M12 3 5 6v5.6c0 4.4 2.9 7.4 7 9.4 4.1-2 7-5 7-9.4V6l-7-3Z" />,
  shieldCheck: (
    <>
      <path d="M12 3 5 6v5.6c0 4.4 2.9 7.4 7 9.4 4.1-2 7-5 7-9.4V6l-7-3Z" />
      <path d="m9 11.6 2.1 2.1 4-4.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.3 16.3 4.2 4.2" />
    </>
  ),
  activity: <path d="M3 12h3.2l2.3-7 3.6 14 2.6-9 1.7 2.5H21" />,
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  transfer: (
    <>
      <path d="M4 8h15M15.5 4.5 19 8l-3.5 3.5" />
      <path d="M20 16H5M8.5 12.5 5 16l3.5 3.5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.4" />
      <circle cx="9" cy="17" r="2.4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8.2 8.2 0 1 0 10.5 10.5Z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  arrowRight: <path d="M4 12h15M13 6l6 6-6 6" />,
  arrowLeft: <path d="M20 12H5M11 18l-6-6 6-6" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  chevronDown: <path d="m5 9 7 7 7-7" />,
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M4 8h16M15 12h3" />
    </>
  ),
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  alert: (
    <>
      <path d="M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4.2M12 16.7h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  x: <path d="m6 6 12 12M18 6 6 18" />,
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v2" />
    </>
  ),
  fingerprint: (
    <>
      <path d="M12 4a8 8 0 0 0-8 8v2M20 12a8 8 0 0 0-4.5-7.2" />
      <path d="M8 12a4 4 0 0 1 8 0v3.5M12 12v5M16.5 18.5c.8-1.2 1.2-2.6 1.2-4.2M6.5 17.6c.4-1 .6-2.1.6-3.4" />
      <path d="M9.4 20a10 10 0 0 0 1.4-4.7" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
    </>
  ),
  download: <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 19.5h16" />,
  printer: (
    <>
      <path d="M7 9V3h10v6M7 18H4.5A1.5 1.5 0 0 1 3 16.5v-5A1.5 1.5 0 0 1 4.5 10h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17" />
      <rect x="7" y="14" width="10" height="7" rx="1.4" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="12" rx="2" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
  refresh: <path d="M20 11a8 8 0 1 0-2.3 6M20 4v7h-7" />,
  pause: <path d="M9 5v14M15 5v14" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  car: (
    <>
      <path d="m5 11 1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11" />
      <path d="M3.5 11h17A1.5 1.5 0 0 1 22 12.5v3A1.5 1.5 0 0 1 20.5 17h-17A1.5 1.5 0 0 1 2 15.5v-3A1.5 1.5 0 0 1 3.5 11Z" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M9 17h6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  photo: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.4" />
      <circle cx="9" cy="9.5" r="1.8" />
      <path d="m4 18 4.7-4.7a2 2 0 0 1 2.8 0L16 17l2-2a2 2 0 0 1 2.8 0L22 16.2" />
    </>
  ),
  wrench: <path d="M20.5 5.5a5.2 5.2 0 0 1-6.8 6.8l-7.4 7.4a2.2 2.2 0 0 1-3.1-3.1l7.4-7.4a5.2 5.2 0 0 1 6.8-6.8L13.7 6l1.2 3.1L18 10.3l3.5-3.6Z" />,
  flag: (
    <>
      <path d="M5 21V4M5 4h11l-1.4 3.5L16 11H5" />
    </>
  ),
  network: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  gauge: (
    <>
      <path d="M4.2 18a9 9 0 1 1 15.6 0" />
      <path d="m12 14 4-4" />
      <circle cx="12" cy="14" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 6M17.5 14.5a5.5 5.5 0 0 1 3 5" />
    </>
  ),
  building: (
    <>
      <path d="M4 21h16M6 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M18 21V10h2v11" />
      <path d="M9 7h2M13 7h0M9 11h2M13 11h0M9 15h2M13 15h0" />
    </>
  ),
  certificate: (
    <>
      <path d="M6 3h12a1.5 1.5 0 0 1 1.5 1.5V15L12 21l-7.5-6V4.5A1.5 1.5 0 0 1 6 3Z" />
      <path d="m9 9 2 2 4-4" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10" />,
  sparkle: <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5ZM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z" />,
  route: (
    <>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M8.4 6H14a4 4 0 0 1 0 8h-4a3 3 0 0 0 0 6h5.6" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8M16 6l2 2M14 8l2 2" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="7" cy="18" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
      <path d="M3 3v5h5M12 7.5V12l3 2" />
    </>
  ),
};

export default function Icon({
  name,
  size = 18,
  className = "",
  strokeWidth = 1.75,
  ...rest
}) {
  const glyph = ICONS[name] || ICONS.info;

  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {glyph}
    </svg>
  );
}
