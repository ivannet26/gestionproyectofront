function DashboardSection({ title, description, children, className = "" }) {
  return (
    <section className={`dashboard-section ${className}`.trim()}>
      <header className="dashboard-section__header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </header>
      <div className="dashboard-section__content">{children}</div>
    </section>
  );
}

export default DashboardSection;
