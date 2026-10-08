import styles from "./KpiCard.module.css";

interface KpiCardProps {
  label: string;
  value: string | number;
  detail: string;
  tone: string;
}

function KpiCard({ label, value, detail, tone }: KpiCardProps) {
  return (
    <article className={`${styles["kpi-card"]} ${styles[`kpi-card--${tone}`]}`}>
      <div className={styles["kpi-card__topline"]}>
        <span className={styles["kpi-card__marker"]} aria-hidden="true" />
        <span className={styles["kpi-card__label"]}>{label}</span>
      </div>
      <strong className={styles["kpi-card__value"]}>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default KpiCard;
