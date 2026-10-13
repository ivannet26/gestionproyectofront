interface KpiCardProps {
  label: string;
  value: string | number;
  detail: string;
  tone?: string;
}

function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <article className="min-w-0 px-4 py-4 bg-white border border-neutral-200 border-t-[3px] border-t-neutral-900 shadow-none">
      <div className="flex items-center gap-2">
        <span className="w-[3px] h-3.5 flex-none bg-neutral-900" aria-hidden="true" />
        <span className="text-neutral-900 text-sm font-semibold">{label}</span>
      </div>
      <strong className="block mt-4 text-neutral-900 text-3xl leading-none tracking-tight font-semibold">{value}</strong>
      <p className="m-0 mt-2 text-neutral-600 text-xs">{detail}</p>
    </article>
  );
}

export default KpiCard;
