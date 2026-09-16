export default function SectionDivider({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="h-px flex-1 bg-neutral-200" />
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <div className="h-px flex-1 bg-neutral-200" />
    </div>
  );
}
