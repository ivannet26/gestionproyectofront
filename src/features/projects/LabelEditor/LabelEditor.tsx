import { useId, useState } from "react";
import type { Label, LabelKind } from "../types";
import LabelList from "../LabelList/LabelList";
import formStyles from "../ProjectForm/ProjectForm.module.css";
import styles from "./LabelEditor.module.css";

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
    <fieldset className={formStyles.options}>
      <legend>{title}</legend>
      <div className={styles.editor}>
        <div className={formStyles.field}>
          <label htmlFor={nameId}>Etiqueta</label>
          <input id={nameId} value={name} maxLength={120} onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addLabel(); } }} />
        </div>
        <div className={formStyles.field}>
          <label htmlFor={kindId}>Clasificación</label>
          <select id={kindId} value={kind} onChange={(event) => setKind(event.target.value === "technical" ? "technical" : "nontechnical")}>
            <option value="technical">Técnica</option><option value="nontechnical">No técnica</option>
          </select>
        </div>
        <button type="button" className={formStyles.secondary} onClick={addLabel}>Agregar</button>
      </div>
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      <LabelList labels={labels} onRemove={(index) => onChange(labels.filter((_, position) => position !== index))} />
    </fieldset>
  );
}
