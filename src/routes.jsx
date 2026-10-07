import AdminAccountsPage from "./auth/AdminAccountsPage.jsx";
import Dashboard from "./components/dashboard/Dashboard.jsx";

export const appRoutes = [
  {
    path: "/",
    Component: Dashboard,
  },
  {
    path: "/administracion/cuentas",
    Component: AdminAccountsPage,
    requiresAdmin: true,
  },
];
