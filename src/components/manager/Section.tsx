"use client";

// Collapsible manager section (design/boards/Manager.dc.html): the whole
// header is one toggle button (icon, title, status chip, chevron). `extra`
// sits beside it and stays usable while closed (e.g. the auto-update switch).
export type Chip = { label: string; tone: "gold" | "green" | "grey" | "red" };

const CHIP_CLASS: Record<Chip["tone"], string> = {
  gold: "bg-[#FBF3D9] text-[#5C4400]",
  green: "bg-green-50 text-[#14512D]",
  grey: "bg-[#EFEFEA] text-[#3F4440]",
  red: "bg-[#FDF1F0] text-danger",
};

export default function Section({
  id,
  icon,
  title,
  chip,
  open,
  onToggle,
  extra,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  chip?: Chip | null;
  open: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-[20px] border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={`${id}-body`}
            className="flex min-h-11 w-full items-center gap-[9px] text-start text-lg font-black"
          >
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-green-50 text-pitch-600">
              {icon}
            </span>
            <span className="truncate">{title}</span>
            {chip && !open && (
              <span className={"whitespace-nowrap rounded-full px-[9px] py-[3px] text-[11px] font-extrabold " + CHIP_CLASS[chip.tone]}>
                {chip.label}
              </span>
            )}
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#55645A"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={"ms-auto shrink-0 transition-transform " + (open ? "rotate-180" : "")}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </h2>
        {extra}
      </div>
      {open && (
        <div id={`${id}-body`} className="mt-3 flex flex-col gap-3">
          {children}
        </div>
      )}
    </section>
  );
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={
        "flex h-8 w-14 shrink-0 rounded-full p-[3px] transition-colors disabled:opacity-50 " +
        (on ? "justify-end bg-pitch-600" : "justify-start bg-miss")
      }
      dir="ltr"
    >
      <span className="h-[26px] w-[26px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.3)]" />
    </button>
  );
}
