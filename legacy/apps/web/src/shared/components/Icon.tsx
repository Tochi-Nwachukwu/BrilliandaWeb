import type { SVGProps } from "react";

// Menu and page icons: one stroke weight on a 24-unit grid. The small 16-unit icons in icons.tsx
// stay for inline marks (chevrons, ticks).
const PATHS = {
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  classes: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  publish: (
    <>
      <path d="M4 12l16-8-6 16-3-7z" />
      <path d="M11 13l9-9" />
    </>
  ),
  students: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 4.8a3 3 0 0 1 0 6" />
      <path d="M18 14.8c1.9.7 3 2.4 3 5.2" />
    </>
  ),
  staff: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8 17c.8-1.8 2.2-2.6 4-2.6s3.2.8 4 2.6" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  results: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7" />
      <path d="M3 20h18" />
    </>
  ),
  school: (
    <>
      <path d="M3 10l9-5 9 5-9 5z" />
      <path d="M7 12.5V17c1.5 1.5 3 2 5 2s3.5-.5 5-2v-4.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13l2.5-8h11L20 13v6H4z" />
      <path d="M4 13h5l1 2h4l1-2h5" />
    </>
  ),
  activity: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  logout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5M5 12h11" />
    </>
  ),
  scores: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  upload: <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.3-4.3" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
