import { useContext } from "react";
import { LoadingContext } from "../context/LoadingContext";

export function useLoading() {
  const context = useContext(LoadingContext);

  if (context === null) {
    throw new Error("useLoading debe utilizarse dentro de LoadingProvider");
  }

  return context;
}
