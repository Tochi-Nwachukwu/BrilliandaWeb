import type { SVGProps } from "react";

const stroke = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

type IconProps = SVGProps<SVGSVGElement>;

export function ChevronLeft(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M10 3.5 5.5 8l4.5 4.5" />
    </svg>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <svg {...stroke} {...props}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

export function Check(props: IconProps) {
  return (
    <svg {...stroke} strokeWidth={2.25} {...props}>
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}
