import { createContext } from "react";

export interface LoadingContextValue {
  isLoading: boolean;
  showLoading: () => void;
  hideLoading: () => void;
  startLoading: () => () => void;
}

export const LoadingContext = createContext<LoadingContextValue | null>(null);
