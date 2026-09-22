function KpiCard({ label, value, detail, tone }) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__topline">
        <span className="kpi-card__marker" aria-hidden="true" />
        <span className="kpi-card__label">{label}</span>
      </div>
      <strong className="kpi-card__value">{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

export default KpiCard
