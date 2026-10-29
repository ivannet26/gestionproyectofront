import { useLoading } from "../../hooks/useLoading";

export function GlobalLoading() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  const theme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

  return (
    <div
      role="status"
      aria-label="Cargando"
      className={`fixed inset-0 z-50 grid place-items-center ${theme == "dark" ? `bg-[#101011]` : ` bg-white`}`}
    >
      <video
        src={theme == "dark" ? "/loading-dark.webm" : "/loading.webm"}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="size-16"
      />
    </div>
  );
}
