export interface CursorPage<T> {
  results: T[];
  total: number;
  cursor: string;
  next_cursor: string | null;
}

export interface PageNavigation {
  total: number | null;
  count: number;
  hasPrevious: boolean;
  hasNext: boolean;
  pending: boolean;
  previous: () => void;
  next: () => void;
  reload: () => void | Promise<void>;
}
