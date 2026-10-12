import type { Label } from "../types";
import styles from "./LabelList.module.css";

interface LabelListProps {
  labels: (Label & { id?: number })[];
  onRemove?: (index: number) => void;
}

export default function LabelList({ labels, onRemove }: LabelListProps) {
  if (labels.length === 0) return null;
  return <ul className={styles.list}>
    {labels.map((label, index) => <li key={label.id ?? `${label.kind}:${label.name}`}>
      <span>{label.name} · {label.kind === "technical" ? "Técnica" : "No técnica"}</span>
      {onRemove && <button type="button" aria-label={`Retirar ${label.name}`} onClick={() => onRemove(index)}>×</button>}
    </li>)}
  </ul>;
}
