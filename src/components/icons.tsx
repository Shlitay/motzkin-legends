type IconProps = { className?: string; size?: number };

const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function OneXTwoIcon({ className, size }: IconProps) {
  return (
    <svg
      {...base}
      width={size ?? base.width}
      height={size ?? base.height}
      className={className}
      style={{ direction: "ltr" }}
    >
      <text x="0" y="17" fontSize="10" fontWeight="700" stroke="none" fill="currentColor">
        1
      </text>
      <text x="8" y="17" fontSize="10" fontWeight="700" stroke="none" fill="currentColor">
        X
      </text>
      <text x="17" y="17" fontSize="10" fontWeight="700" stroke="none" fill="currentColor">
        2
      </text>
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
    </svg>
  );
}

export function WinnerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 6.5v7.5" />
      <path d="M12 9 7.5 5" />
      <path d="M12 9l4.5-4" />
      <path d="M12 14l-3.5 6" />
      <path d="M12 14l3.5 6" />
    </svg>
  );
}

export function BookIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v14.5a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 0 5 21V4.5Z" />
      <path d="M5 17.5A1.5 1.5 0 0 1 6.5 16H20" />
    </svg>
  );
}

export function GaugeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 15.5a7.5 7.5 0 1 1 15 0" />
      <path d="M12 15.5 15 10" />
      <circle cx="12" cy="15.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function ClockIcon({ className, size }: IconProps) {
  return (
    <svg {...base} width={size ?? base.width} height={size ?? base.height} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function CheckCircleIcon({ className, size }: IconProps) {
  return (
    <svg {...base} width={size ?? base.width} height={size ?? base.height} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.5l2.3 2.3L15.7 9.5" />
    </svg>
  );
}
