import { useId, useState } from "react";
import type { Label, LabelKind } from "../types";
import LabelList from "../LabelList/LabelList";
import { fieldClass, inputClass, labelClass, secondaryButtonClass } from "../ProjectForm/ProjectForm";

interface LabelEditorProps {
  title: string;
  labels: Label[];
  onChange: (labels: Label[]) => void;
}

export default function LabelEditor({ title, labels, onChange }: LabelEditorProps) {
  const nameId = useId();
  const kindId = useId();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<LabelKind>("technical");
  const [error, setError] = useState("");

  function addLabel() {
    const clean = name.trim();
    if (!clean) { setError("Escribe el nombre de la etiqueta."); return; }
    if (labels.length >= 50) { setError("Puedes incluir hasta 50 etiquetas."); return; }
    if (labels.some((label) => label.name.toLocaleLowerCase() === clean.toLocaleLowerCase() && label.kind === kind)) {
      setError("Esta etiqueta ya está incluida.");
      return;
    }
    onChange([...labels, { name: clean, kind }]);
    setName("");
    setError("");
  }

  return (
    <fieldset className="grid gap-2.5 p-3.5 border border-neutral-200 shadow-none min-w-0">
      <legend className="text-sm font-semibold text-neutral-900">{title}</legend>
      <div className="grid grid-cols-1 gap-2.5 items-end sm:grid-cols-[1fr_1fr_auto]">
        <div className={fieldClass}>
          <label htmlFor={nameId} className={labelClass}>Etiqueta</label>
          <input id={nameId} value={name} maxLength={120} onChange={(event) => setName(event.target.value)} className={inputClass}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addLabel(); } }} />
        </div>
        <div className={fieldClass}>
          <label htmlFor={kindId} className={labelClass}>Clasificación</label>
          <select id={kindId} value={kind} onChange={(event) => setKind(event.target.value === "technical" ? "technical" : "nontechnical")} className={inputClass}>
            <option value="technical">Técnica</option><option value="nontechnical">No técnica</option>
          </select>
        </div>
        <button type="button" className={secondaryButtonClass} onClick={addLabel}>Agregar</button>
      </div>
      {error && <p className="border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-none" role="alert">{error}</p>}
      <LabelList labels={labels} onRemove={(index) => onChange(labels.filter((_, position) => position !== index))} />
    </fieldset>
  );
}
