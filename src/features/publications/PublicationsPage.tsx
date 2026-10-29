import PublicationsManager from "./PublicationsManager";
import PublicationsView from "./PublicationsView";

interface PublicationsPageProps {
  canManage: boolean;
}

export default function PublicationsPage({ canManage }: PublicationsPageProps) {
  return canManage ? <PublicationsManager /> : <PublicationsView />;
}
