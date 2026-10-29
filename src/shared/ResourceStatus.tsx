interface ResourceStatusProps {
  label: string;
  loading: boolean;
  refreshing?: boolean;
  error: string;
  ready?: boolean;
  refetch: () => void | Promise<void>;
}

export default function ResourceStatus({ label, loading, refreshing, error, refetch, ready }: ResourceStatusProps) {
  return <div aria-live="polite" className="text-xs text-neutral-600">
    {(loading || refreshing) && <p role="status" className="my-2">{loading ? "Cargando" : "Actualizando"} {label}…</p>}
    {ready && (refreshing || error) && <p className="my-1">Se conservan los datos de la última carga.</p>}
    {error && <div role="alert" className="my-2 flex flex-wrap items-center gap-2 text-red-700">
      <span>No se pudo cargar {label}. {error}</span>
      <button type="button" disabled={loading || refreshing} onClick={() => void refetch()}
        className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 disabled:opacity-50">Reintentar {label}</button>
    </div>}
  </div>;
}
