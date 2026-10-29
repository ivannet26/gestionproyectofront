import { useEffect, useRef } from "react";

export interface ProjectContinuationProps {
  label: string;
  ready: boolean;
  pending: boolean;
  error: string;
  hasMore: boolean;
  enabled: boolean;
  more: () => Promise<void>;
  retry: () => Promise<void>;
}

export default function ProjectContinuation({ label, pending, error, hasMore, enabled, more, retry }: ProjectContinuationProps) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled || pending || error || !hasMore || !end.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) void more(); });
    observer.observe(end.current);
    return () => observer.disconnect();
  }, [enabled, pending, error, hasMore, more]);
  return <div ref={end} className="px-3 py-1 text-[10px] text-neutral-600" aria-live="polite">
    {pending && <span role="status">Cargando {label}…</span>}
    {error && <div role="alert" className="break-words">No se pudieron cargar {label}. {error} <button type="button" onClick={() => { void retry(); }} className="cursor-pointer rounded px-1 py-0.5 underline focus-visible:outline-2 focus-visible:outline-neutral-700">Reintentar</button></div>}
    {!pending && !error && hasMore && <><span>Más {label} al desplazarte…</span><button type="button" onClick={() => { void more(); }}
      className="sr-only cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 text-xs focus:not-sr-only focus-visible:outline-2 focus-visible:outline-neutral-700">Cargar más {label}</button></>}
  </div>;
}
