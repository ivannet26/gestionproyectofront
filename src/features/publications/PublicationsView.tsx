import { useEffect, useState } from "react";
import SearchIcon from "../../shared/icons/SearchIcon";
import PublicationBoard from "./components/PublicationBoard";
import PublicationDetail from "./components/PublicationDetail";
import { useToast } from "../../hooks/useToast";
import { usePublications } from "./hooks/usePublications";

export default function PublicationsView() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, loading, error, refetch, apply } = usePublications({
    search: query || undefined,
  });
  const { addToast } = useToast();
  const selected =
    detailId === null
      ? null
      : (data.find((publication) => publication.id === detailId) ?? null);

  function clearSearch() {
    setSearch("");
    setQuery("");
  }

  return (
    <main id="main-content" className="min-h-full bg-white text-neutral-800">
      <header className="mb-6">
        <h1 className="text-lg font-medium text-neutral-800">Publicaciones</h1>
        <p className="mt-0.5 text-sm text-neutral-600">
          Explora las oportunidades abiertas de tus proyectos.
        </p>
      </header>

      <div role="search" className="mb-4">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={search}
            maxLength={100}
            placeholder="Buscar por título o proyecto"
            aria-label="Buscar publicaciones"
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-800 placeholder:text-neutral-600 focus:border-neutral-400 focus:outline-none"
          />
        </div>
      </div>

      {error && data.length > 0 && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="cursor-pointer rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      )}

      <section aria-label="Publicaciones" aria-busy={loading}>
        <p className="mb-4 text-xs font-normal text-neutral-500">
          {data.length} {data.length === 1 ? "publicación" : "publicaciones"}
          {loading && data.length > 0 && (
            <span role="status" className="ml-2 text-neutral-400">
              Actualizando…
            </span>
          )}
        </p>

        {loading && data.length === 0 ? (
          <p
            role="status"
            className="py-16 text-center text-xs text-neutral-500"
          >
            Cargando publicaciones…
          </p>
        ) : error && data.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center">
            <h2 className="text-sm font-medium text-neutral-800">
              No se pudieron cargar las publicaciones
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-neutral-600">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
            >
              Reintentar
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center">
            <h2 className="text-sm font-medium text-neutral-800">
              {query ? "Sin resultados" : "No hay ofertas abiertas"}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-neutral-600">
              {query
                ? "No hay publicaciones que coincidan con tu búsqueda."
                : "No hay publicaciones abiertas para tus áreas en este momento."}
            </p>
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="mt-4 cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <PublicationBoard
            publications={data}
            onOpen={(publication) => setDetailId(publication.id)}
          />
        )}
      </section>

      {selected && (
        <PublicationDetail
          key={selected.id}
          publication={selected}
          applied={selected.applied}
          onClose={() => setDetailId(null)}
          onApply={async () => {
            try {
              await apply(selected.id);
              addToast({
                icon: "success",
                title: "Postulacion enviada",
                message: "Te postulaste correctamente a la oferta.",
              });
            } catch (failure) {
              addToast({
                icon: "error",
                title: "No se pudo postular",
                message:
                  failure instanceof Error
                    ? failure.message
                    : "No se pudo completar la postulacion",
              });
              throw failure;
            }
          }}
        />
      )}
    </main>
  );
}
