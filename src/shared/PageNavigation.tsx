import type { PageNavigation as Navigation } from "../core/interfaces/pagination.interface";

export default function PageNavigation({ label, navigation, busy = false }: {
  label: string; navigation: Navigation; busy?: boolean;
}) {
  const disabled = navigation.pending || busy;
  const button = "cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-neutral-700";
  return <nav aria-label={`Paginación de ${label}`} className="my-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
    <span aria-live="polite" className="mr-auto tabular-nums">
      {navigation.total === null ? "Resultados pendientes" : `${navigation.count} en esta página · ${navigation.total} resultados`}
    </span>
    <button type="button" className={button} disabled={disabled || !navigation.hasPrevious} onClick={navigation.previous}>Anterior</button>
    <button type="button" className={button} disabled={disabled || !navigation.hasNext} onClick={navigation.next}>Siguiente</button>
    <button type="button" className={button} disabled={disabled} onClick={() => void navigation.reload()}>Actualizar listado</button>
  </nav>;
}
