import { useMemo, useState } from "react";
import type { CursorPage } from "../core/interfaces/pagination.interface";
import { sessionVersion } from "../features/auth/api";
import { useRemoteResource } from "./useRemoteResource";

type Loader<T> = (cursor: string | null) => Promise<CursorPage<T>>;

function navigationFor<T>(load: Loader<T>, epoch: number, cursor: string | null = null, previous: string[] = []) {
  return { load, epoch, previous, read: () => load(cursor) };
}

export function useCursorPage<T>(load: Loader<T>, scope: string, enabled = true) {
  const epoch = sessionVersion();
  const initial = useMemo(() => navigationFor(load, epoch), [load, epoch]);
  const [navigation, setNavigation] = useState(initial);
  const current = navigation.load === load && navigation.epoch === epoch ? navigation : initial;
  const resource = useRemoteResource(current.read, scope, enabled);
  const page = resource.value;
  function next() {
    if (!resource.isCurrent() || resource.pending || !page?.next_cursor) return;
    setNavigation(navigationFor(load, epoch, page.next_cursor, [...current.previous, page.cursor]));
  }
  function previous() {
    if (!resource.isCurrent() || resource.pending || !current.previous.length) return;
    setNavigation(navigationFor(load, epoch, current.previous[current.previous.length - 1], current.previous.slice(0, -1)));
  }
  async function reload() {
    if (!resource.isCurrent()) return;
    setNavigation(navigationFor(load, epoch));
  }
  return {
    ...resource, page, data: page?.results ?? [],
    navigation: {
      total: page?.total ?? null, count: page?.results.length ?? 0,
      hasPrevious: current.previous.length > 0, hasNext: !resource.error && Boolean(page?.next_cursor),
      pending: resource.pending, previous, next, reload,
    }, reload,
  };
}
