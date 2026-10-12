import { useId } from "react";
import type { ProjectArea } from "../types";
import styles from "./AreaSelector.module.css";

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
    <div className={styles.selector}>
      <label htmlFor={selectId}>Áreas participantes *</label>
      <select
        id={selectId}
        value=""
        required={selected.length === 0}
        disabled={remaining.length === 0 || atLimit}
        aria-describedby={hintId}
        onChange={(event) => {
          const id = Number(event.target.value);
          if (remaining.some((area) => area.id === id)) onChange([...selected, id]);
        }}
      >
        <option value="">{placeholder}</option>
        {remaining.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
      </select>
      <p id={hintId} className="field-hint">Selecciona una o más áreas. Puedes retirarlas antes de continuar.</p>
      {selected.length > 0 && (
        <ul className={styles.selected} aria-label="Áreas seleccionadas">
          {selected.map((id) => {
            const area = options.find((item) => item.id === id);
            return (
              <li key={id}>
                <span>{area?.name ?? "Área no disponible"}</span>
                <button type="button" aria-label={`Retirar área ${area?.name ?? id}`}
                  onClick={() => onChange(selected.filter((item) => item !== id))}>×</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
