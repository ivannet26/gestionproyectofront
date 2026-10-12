import AreasSection from "./AreasSection";
import TeamsSection from "./TeamsSection";
import SpecialtiesSection from "./SpecialtiesSection";
import styles from "./OrganizationPage.module.css";

function OrganizationPage() {
  return (
    <main className="dashboard" id="main-content">
      <header className="page-header">
        <div className={styles["org-header"]}>
          <h2>Organización</h2>
          <p>Áreas, equipos y especialidades de la organización.</p>
        </div>
      </header>
      <div className={styles["panels"]}>
        <div className={`${styles["panel"]} ${styles["panel--areas"]}`}>
          <AreasSection />
        </div>
        <div className={`${styles["panel"]} ${styles["panel--teams"]}`}>
          <TeamsSection />
        </div>
        <div className={`${styles["panel"]} ${styles["panel--specialties"]}`}>
          <SpecialtiesSection />
        </div>
      </div>
    </main>
  );
}

export default OrganizationPage;
