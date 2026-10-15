import { useLoading } from "../../hooks/useLoading";

export function GlobalLoading() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div
      role="status"
      aria-label="Cargando"
      className="fixed inset-0 z-50 grid place-items-center bg-white"
    >
      <video
        src="/loading.webm"
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
