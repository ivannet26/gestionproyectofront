import { useId, useRef, useState } from "react";
import type { Label, LabelKind } from "../types";
import LabelList from "../LabelList/LabelList";
import formStyles from "../ProjectForm/ProjectForm.module.css";
import styles from "./LabelEditor.module.css";

interface LabelEditorProps {
  title: string;
  labels: Label[];
  onChange: (labels: Label[]) => void;
  compact?: boolean;
}

export default function LabelEditor({ title, labels, onChange, compact = false }: LabelEditorProps) {
  const nameId = useId();
  const kindId = useId();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<LabelKind>("technical");
  const [error, setError] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);

  function addLabel() {
    const clean = name.trim();
    if (!clean) { setError("Escribe el nombre de la etiqueta."); nameInput.current?.focus(); return; }
    if (labels.length >= 50) { setError("Puedes incluir hasta 50 etiquetas."); nameInput.current?.focus(); return; }
    if (labels.some((label) => label.name.toLocaleLowerCase() === clean.toLocaleLowerCase() && label.kind === kind)) {
      setError("Esta etiqueta ya está incluida.");
      nameInput.current?.focus();
      return;
    }
    onChange([...labels, { name: clean, kind }]);
    setName("");
    setError("");
    nameInput.current?.focus();
  }

  return (
    <fieldset className={compact ? styles.compact : formStyles.options}>
      <legend>{title}</legend>
      <div className={styles.editor}>
        <div className={formStyles.field}>
          <label htmlFor={nameId}>Etiqueta</label>
          <input ref={nameInput} id={nameId} name="label_name" value={name} maxLength={120}
            aria-invalid={Boolean(error)} aria-describedby={error ? `${nameId}-error` : undefined}
            placeholder="Por ejemplo, revisión técnica…" onChange={(event) => { setName(event.target.value); setError(""); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addLabel(); } }} />
          {error && <p id={`${nameId}-error`} className={formStyles.fieldError} role="alert">{error}</p>}
        </div>
        <div className={formStyles.field}>
          <label htmlFor={kindId}>Clasificación</label>
          <select id={kindId} name="label_kind" value={kind} onChange={(event) => { setKind(event.target.value === "technical" ? "technical" : "nontechnical"); setError(""); }}>
            <option value="technical">Técnica</option><option value="nontechnical">No técnica</option>
          </select>
        </div>
        <button type="button" className={formStyles.secondary} onClick={addLabel}>Agregar</button>
      </div>
      <LabelList labels={labels} onRemove={(index) => onChange(labels.filter((_, position) => position !== index))} />
    </fieldset>
  );
}
