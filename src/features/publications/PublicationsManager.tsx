import { useEffect, useState } from "react";
import ChevronDownIcon from "../../shared/icons/ChevronDownIcon";
import PlusIcon from "../../shared/icons/PlusIcon";
import SearchIcon from "../../shared/icons/SearchIcon";
import { useToast } from "../../hooks/useToast";
import type {
  Publication,
  PublicationCreateData,
  PublicationStateCode,
  PublicationUpdateData,
} from "../../core/interfaces/publication.interface";
import { publicationErrorText } from "../../core/services/publicationService";
import PublicationBoard from "./components/PublicationBoard";
import PublicationDetail from "./components/PublicationDetail";
import PublicationForm from "./components/PublicationForm";
import { usePublicationCatalogs } from "./hooks/usePublicationCatalogs";
import { usePublications } from "./hooks/usePublications";
import { PUBLICATION_STATE_LABELS } from "./utils/publication";

function ErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
      >
        Reintentar
      </button>
    </div>
  );
}

export default function PublicationsManager() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"" | PublicationStateCode>("");
  const [projectFilter, setProjectFilter] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState<{ publication?: Publication } | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, loading, error, refetch, create, update, changeState } =
    usePublications({
      search: query || undefined,
      state: stateFilter || undefined,
      project_id: projectFilter ? Number(projectFilter) : undefined,
    });
  const catalogsQuery = usePublicationCatalogs(true);
  const catalogs = catalogsQuery.data;
  const canWrite = catalogs !== null && !catalogsQuery.error;
  const selected =
    detailId === null
      ? null
      : (data.find((publication) => publication.id === detailId) ?? null);
  const hasFilters = query !== "" || stateFilter !== "" || projectFilter !== "";

  function clearFilters() {
    setSearch("");
    setQuery("");
    setStateFilter("");
    setProjectFilter("");
  }

  function openCreate() {
    if (canWrite) setForm({});
  }

  function openEdit(publication: Publication) {
    if (canWrite) setForm({ publication });
  }

  async function save(payload: PublicationCreateData | PublicationUpdateData) {
    if (form?.publication) {
      await update(form.publication.id, payload as PublicationUpdateData);
      addToast({
        icon: "success",
        title: "Publicación actualizada",
        message: "Los cambios se guardaron correctamente.",
      });
    } else {
      await create(payload as PublicationCreateData);
      addToast({
        icon: "success",
        title: "Publicación creada",
        message: "La oferta quedó en estado borrador.",
      });
    }
  }

  async function changeSelectedState(state: PublicationStateCode) {
    if (!selected) return;
    try {
      await changeState(selected.id, state);
      addToast({
        icon: "success",
        title: "Estado actualizado",
        message: `La publicación quedó en estado ${PUBLICATION_STATE_LABELS[state].toLocaleLowerCase("es")}.`,
      });
    } catch (failure) {
      addToast({
        icon: "error",
        title: "No se pudo cambiar el estado",
        message: publicationErrorText(failure),
      });
      throw failure;
    }
  }

  function renderResults() {
    if (loading && data.length === 0) {
      return (
        <p role="status" className="py-16 text-center text-xs text-neutral-500">
          Cargando publicaciones…
        </p>
      );
    }

    if (error && data.length === 0) {
      return (
        <section className="rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center">
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
        </section>
      );
    }

    if (data.length === 0) {
      return (
        <section className="rounded-xl border border-neutral-200 bg-white px-6 py-16 text-center">
          <h2 className="text-sm font-medium text-neutral-800">
            {hasFilters ? "Sin resultados" : "Aún no hay publicaciones"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-neutral-600">
            {hasFilters
              ? "No hay publicaciones que coincidan con los filtros aplicados."
              : "Crea la primera oferta de empleo y publícala cuando esté lista."}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
            >
              Limpiar filtros
            </button>
          ) : (
            canWrite && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
              >
                <PlusIcon className="size-4" />
                Crear publicación
              </button>
            )
          )}
        </section>
      );
    }

    return (
      <PublicationBoard
        publications={data}
        canEdit={(publication) => canWrite && publication.permissions.edit}
        onOpen={(publication) => setDetailId(publication.id)}
        onEdit={openEdit}
      />
    );
  }

  return (
    <main id="main-content" className="min-h-full bg-white text-neutral-800">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-medium text-neutral-800">
            Publicaciones
          </h1>
          <p className="mt-0.5 text-sm text-neutral-600">
            Gestiona las ofertas de empleo de tus proyectos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!canWrite}
          title={
            catalogsQuery.loading
              ? "Cargando catálogos…"
              : catalogsQuery.error
                ? "No se pudieron cargar los catálogos"
                : undefined
          }
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="size-4" />
          Nueva publicación
        </button>
      </header>

      {catalogsQuery.error && (
        <ErrorAlert
          message="No se pudieron cargar los catálogos para crear o editar publicaciones."
          onRetry={catalogsQuery.retry}
        />
      )}
      {error && data.length > 0 && (
        <ErrorAlert message={error} onRetry={() => void refetch()} />
      )}

      <section aria-label="Publicaciones">
        <div role="search" className="mb-4 flex flex-wrap items-center gap-2">
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

          <div className="relative">
            <select
              value={stateFilter}
              aria-label="Filtrar por estado"
              onChange={(event) =>
                setStateFilter(event.target.value as "" | PublicationStateCode)
              }
              className="cursor-pointer appearance-none rounded-lg border border-neutral-200 bg-white py-1.5 pl-3 pr-8 text-xs text-neutral-800 focus:border-neutral-400 focus:outline-none"
            >
              <option value="">Todos los estados</option>
              {Object.entries(PUBLICATION_STATE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          </div>

          <div className="relative">
            <select
              value={projectFilter}
              aria-label="Filtrar por proyecto"
              onChange={(event) => setProjectFilter(event.target.value)}
              className="max-w-56 cursor-pointer appearance-none truncate rounded-lg border border-neutral-200 bg-white py-1.5 pl-3 pr-8 text-xs text-neutral-800 focus:border-neutral-400 focus:outline-none"
            >
              <option value="">Todos los proyectos</option>
              {(catalogs?.projects ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800"
            >
              Limpiar
            </button>
          )}
        </div>

        <p className="mb-4 text-xs font-normal text-neutral-500">
          {data.length} {data.length === 1 ? "publicación" : "publicaciones"}
          {loading && data.length > 0 && (
            <span role="status" className="ml-2 text-neutral-400">
              Actualizando…
            </span>
          )}
        </p>

        <div aria-busy={loading}>{renderResults()}</div>

        {!loading && data.length >= 200 && (
          <p className="mt-3 text-[10px] text-neutral-500">
            Se muestran las 200 publicaciones más recientes.
          </p>
        )}
      </section>

      {selected && (
        <PublicationDetail
          key={selected.id}
          publication={selected}
          canManage
          editDisabled={!canWrite}
          onClose={() => setDetailId(null)}
          onEdit={() => openEdit(selected)}
          onChangeState={changeSelectedState}
        />
      )}

      {form && catalogs && (
        <PublicationForm
          key={form.publication?.id ?? "new"}
          publication={form.publication}
          catalogs={catalogs}
          onClose={() => setForm(null)}
          onSubmit={save}
        />
      )}
    </main>
  );
}
