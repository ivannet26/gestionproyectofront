import { useId } from "react";
import type { ProjectArea } from "../types";

interface AreaSelectorProps {
  options: ProjectArea[];
  selected: number[];
  onChange: (selected: number[]) => void;
}

export default function AreaSelector({ options, selected, onChange }: AreaSelectorProps) {
  const selectId = useId();
  const hintId = useId();
  const remaining = options.filter((area) => !selected.includes(area.id));
  const atLimit = selected.length >= 100;
  const placeholder = options.length === 0 ? "No hay áreas disponibles"
    : atLimit ? "Máximo de áreas alcanzado"
    : remaining.length === 0 ? "Todas las áreas seleccionadas" : "Seleccionar un área…";

  return (
    <div className="grid gap-2 min-w-0">
      <label htmlFor={selectId} className="text-neutral-900 text-sm font-medium">Áreas participantes *</label>
      <select
        id={selectId}
        value=""
        required={selected.length === 0}
        disabled={remaining.length === 0 || atLimit}
        aria-describedby={hintId}
        className="w-full min-h-[40px] px-3 py-2 text-neutral-900 bg-white border border-neutral-200 text-sm shadow-none focus:ring-0 focus-visible:outline-none focus:border-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed"
        onChange={(event) => {
          const id = Number(event.target.value);
          if (remaining.some((area) => area.id === id)) onChange([...selected, id]);
        }}
      >
        <option value="">{placeholder}</option>
        {remaining.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
      </select>
      <p id={hintId} className="m-0 text-xs text-neutral-600 leading-relaxed">Selecciona una o más áreas. Puedes retirarlas antes de continuar.</p>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto m-0 p-0.5 list-none" aria-label="Áreas seleccionadas">
          {selected.map((id) => {
            const area = options.find((item) => item.id === id);
            return (
              <li key={id} className="flex items-center gap-2 max-w-full px-2 py-1 bg-neutral-100 border border-neutral-200 text-xs text-neutral-900 shadow-none">
                <span>{area?.name ?? "Área no disponible"}</span>
                <button type="button" aria-label={`Retirar área ${area?.name ?? id}`}
                  className="w-6 h-6 p-0 border-0 bg-white text-neutral-900 cursor-pointer shadow-none"
                  onClick={() => onChange(selected.filter((item) => item !== id))}>×</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
