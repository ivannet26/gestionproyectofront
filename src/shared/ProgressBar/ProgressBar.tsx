import type { CSSProperties } from "react";
import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  value: number;
  tone?: string;
  label: string;
}

function ProgressBar({ value, tone = "blue", label }: ProgressBarProps) {
  return (
    <div
      className={`${styles["progress-bar"]} ${styles[`progress-bar--${tone}`]}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      style={{ "--progress-value": `${value}%` } as CSSProperties}
    >
      <span className={styles["progress-bar__fill"]} />
    </div>
  );
}

export default ProgressBar;
