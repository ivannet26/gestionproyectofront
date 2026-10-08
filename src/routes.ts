import type { ComponentType } from "react";
import AdminAccountsPage from "./features/auth/AdminAccountsPage/AdminAccountsPage";
import DashboardPage from "./features/dashboard/DashboardPage/DashboardPage";

export interface AppRoute {
  path: string;
  Component: ComponentType;
  requiresAdmin?: boolean;
}

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    Component: DashboardPage,
  },
  {
    path: "/administracion/cuentas",
    Component: AdminAccountsPage,
    requiresAdmin: true,
  },
];
