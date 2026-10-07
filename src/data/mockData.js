export const navigationSections = [
  {
    id: "projects",
    label: "G. Proyectos",
    items: [
      { label: "Resumen", path: "/proyectos/resumen" },
      { label: "Proyectos", path: "/proyectos/lista" },
      { label: "Fases y actividades", path: "/proyectos/fases" },
      { label: "Dependencias", path: "/proyectos/dependencias" },
    ],
  },
  {
    id: "equipment",
    label: "G. Equipos",
    items: [
      { label: "Resumen", path: "/equipos/resumen" },
      { label: "Trabajadores", path: "/equipos/trabajadores" },
      { label: "Equipos", path: "/equipos/lista" },
      { label: "Disponibilidad", path: "/equipos/disponibilidad" },
      { label: "Asignaciones y carga", path: "/equipos/asignaciones" },
    ],
  },
];

export const administrationItem = {
  id: "administration",
  label: "Administración",
  requiresAuthorization: true,
};

export const portfolioSummary = {
  totalProjects: 18,
};

export const kpis = [
  {
    id: "active-projects",
    label: "Proyectos activos",
    value: 14,
    detail: `de ${portfolioSummary.totalProjects} proyectos registrados`,
    tone: "blue",
  },
  {
    id: "delayed-projects",
    label: "Proyectos retrasados",
    value: 3,
    detail: "17% del portafolio",
    tone: "yellow",
  },
  {
    id: "overdue-activities",
    label: "Actividades vencidas",
    value: 7,
    detail: "3 de prioridad alta",
    tone: "red",
  },
  {
    id: "available-staff",
    label: "Personal sin proyecto",
    value: 4,
    detail: "disponible para asignar",
    tone: "green",
  },
];

export const projectStatusSummary = [
  {
    id: "in-progress",
    label: "En ejecución",
    count: 10,
    percentage: 56,
    tone: "blue",
  },
  {
    id: "planning",
    label: "En planificación",
    count: 4,
    percentage: 22,
    tone: "green",
  },
  {
    id: "delayed",
    label: "Con retraso",
    count: 3,
    percentage: 17,
    tone: "red",
  },
  {
    id: "paused",
    label: "En pausa",
    count: 1,
    percentage: 5,
    tone: "yellow",
  },
];

export const projectProgress = [
  {
    id: "water-treatment",
    name: "Planta de tratamiento norte",
    stage: "En ejecución",
    progress: 72,
    tone: "blue",
  },
  {
    id: "south-bridge",
    name: "Reforzamiento Puente Sur",
    stage: "En ejecución",
    progress: 48,
    tone: "blue",
  },
  {
    id: "andean-road",
    name: "Supervisión Vial Andina",
    stage: "En revisión",
    progress: 86,
    tone: "green",
  },
  {
    id: "santa-rosa",
    name: "Expediente técnico Santa Rosa",
    stage: "Con retraso",
    progress: 34,
    tone: "red",
  },
];

export const priorityActivities = [
  {
    id: "structural-report",
    activity: "Validar informe estructural",
    project: "Reforzamiento Puente Sur",
    owner: "Diego Salazar",
    dueDate: "16 sep 2026",
    status: "Vencida",
    tone: "red",
  },
  {
    id: "hydraulic-plans",
    activity: "Aprobar planos hidráulicos",
    project: "Planta de tratamiento norte",
    owner: "Lucía Medina",
    dueDate: "18 sep 2026",
    status: "Vence hoy",
    tone: "yellow",
  },
  {
    id: "site-observations",
    activity: "Levantar observaciones de campo",
    project: "Supervisión Vial Andina",
    owner: "Carlos Rojas",
    dueDate: "19 sep 2026",
    status: "Prioritaria",
    tone: "blue",
  },
  {
    id: "technical-memo",
    activity: "Completar memoria descriptiva",
    project: "Expediente técnico Santa Rosa",
    owner: "Ana Paredes",
    dueDate: "20 sep 2026",
    status: "En revisión",
    tone: "neutral",
  },
];

export const teamWorkload = [
  {
    id: "structures",
    name: "Equipo de estructuras",
    value: 82,
    label: "Alta",
    tone: "red",
  },
  {
    id: "supervision",
    name: "Equipo de supervisión",
    value: 68,
    label: "Media",
    tone: "yellow",
  },
  {
    id: "hydraulics",
    name: "Equipo hidráulico",
    value: 54,
    label: "Media",
    tone: "blue",
  },
  {
    id: "bim",
    name: "Coordinación BIM",
    value: 36,
    label: "Disponible",
    tone: "green",
  },
];
