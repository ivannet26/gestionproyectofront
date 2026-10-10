import type { ComponentType } from "react";
import AdminAccountsPage from "./features/auth/AdminAccountsPage/AdminAccountsPage";
import DashboardPage from "./features/dashboard/DashboardPage/DashboardPage";
import type { DashboardPageProps } from "./features/dashboard/DashboardPage/DashboardPage";
import ProjectList from "./features/projects/ProjectList/ProjectList";
import type { ProjectListProps } from "./features/projects/ProjectList/ProjectList";
import ProjectRoute from "./features/projects/ProjectRoute/ProjectRoute";
import type { ProjectRouteProps } from "./features/projects/ProjectRoute/ProjectRoute";

export type AppRoute = {
  path: string;
  requiresAdmin?: boolean;
} & (
  | { kind: "dashboard"; Component: ComponentType<DashboardPageProps> }
  | { kind: "projectList"; Component: ComponentType<ProjectListProps> }
  | { kind: "project"; Component: ComponentType<ProjectRouteProps> }
  | { kind: "accounts"; Component: ComponentType }
);

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    kind: "dashboard",
    Component: DashboardPage,
  },
  {
    path: "/proyectos",
    kind: "projectList",
    Component: ProjectList,
  },
  {
    path: "/proyectos/resumen",
    kind: "projectList",
    Component: ProjectList,
  },
  {
    path: "/proyectos/:projectId",
    kind: "project",
    Component: ProjectRoute,
  },
  {
    path: "/administracion/cuentas",
    kind: "accounts",
    Component: AdminAccountsPage,
    requiresAdmin: true,
  },
];

export function projectPath(projectId: number): string {
  return `/proyectos/${projectId}`;
}
