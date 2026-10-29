import { useState } from "react";
import XIcon from "../../../shared/icons/XIcon";
import ResourceStatus from "../../../shared/ResourceStatus";
import { errorText } from "../../auth/api";
import { useProfile } from "./useProfile";

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { mine, options, specialties, catalog, saving, addSpecialty, dropSpecialty } = useProfile();
  const [selectedId, setSelectedId] = useState(""), [formError, setFormError] = useState("");
  const editable = mine.ready && !mine.pending && !mine.error && !saving;
  const canAdd = editable && options.ready && !options.pending && !options.error;
  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!canAdd || !catalog.some((item) => String(item.id) === selectedId)) return;
    setFormError("");
    try { await addSpecialty(Number(selectedId)); setSelectedId(""); }
    catch (failure) { setFormError(errorText(failure)); }
  }
  async function remove(id: number) {
    setFormError("");
    try { await dropSpecialty(id); }
    catch (failure) { setFormError(errorText(failure)); }
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="profile-specialties-title" className="w-full max-w-md rounded-xl bg-white">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h3 id="profile-specialties-title" className="m-0 text-sm text-neutral-800">Mis especialidades</h3>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="inline-flex cursor-pointer rounded-full p-1.5 text-neutral-700 hover:bg-neutral-200"><XIcon className="size-4" /></button>
      </header>
      <form onSubmit={add} className="grid gap-3 p-4">
        <ResourceStatus label="tus especialidades" {...mine} />
        {mine.ready && <ul aria-label="Tus especialidades" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {specialties.map((item) => <li key={item.id} className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-1 text-xs font-medium text-white">
            {item.name}<button type="button" disabled={!editable} onClick={() => void remove(item.id)} aria-label={`Quitar ${item.name}`}
              className="inline-flex cursor-pointer text-white hover:text-neutral-100 disabled:opacity-50"><XIcon className="size-3" /></button>
          </li>)}
        </ul>}
        {mine.ready && !mine.pending && !mine.error && !specialties.length && <p role="status" className="m-0 text-xs text-neutral-600">Aún no tienes especialidades.</p>}
        <ResourceStatus label="opciones de especialidades" {...options} />
        <div className="grid gap-1.5">
          <label htmlFor="profile-specialty" className="text-xs text-neutral-800">Añadir especialidad</label>
          <select id="profile-specialty" name="specialty" value={selectedId} disabled={!canAdd}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-neutral-400 focus:outline-none disabled:opacity-50">
            <option value="">Selecciona una especialidad</option>
            {catalog.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        {options.ready && !options.pending && !options.error && !catalog.length && <p className="m-0 text-xs text-neutral-600">No hay más especialidades disponibles.</p>}
        {formError && <p role="alert" className="m-0 text-xs text-red-700">{formError}</p>}
        <footer className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100">Cerrar</button>
          <button type="submit" disabled={!canAdd || !catalog.some((item) => String(item.id) === selectedId)} className="cursor-pointer rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Guardando…" : "Agregar"}</button>
        </footer>
      </form>
    </section>
  </div>;
}
