type StatCardProps = {
  title: string;
  headline: string;
  towards: number;
  points: number;
  hit: number;
};

export default function StatCard({ title, headline, towards, points, hit }: StatCardProps) {
  return (
    <section className="w-full max-w-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>

      <div className="relative overflow-hidden rounded-[28px] bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-18px_rgba(0,0,0,0.28)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] [background:repeating-linear-gradient(45deg,var(--color-brand)_0px,var(--color-brand)_2px,transparent_2px,transparent_14px)]"
        />

        <div className="relative flex flex-col items-center gap-5">
          <span className="rounded-full bg-brand/12 px-4 py-1 text-sm font-semibold text-brand">
            {headline}
          </span>

          <div className="flex w-full divide-x divide-neutral-100">
            <Stat label="towards" value={towards} />
            <Stat label="Points" value={points} />
            <Stat label="hit" value={hit} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 px-2">
      <span className="font-display text-2xl font-bold tabular-nums text-ink">{value}</span>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}
