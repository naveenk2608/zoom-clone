import { useCallback, useEffect, useState } from "react";

import { errorMessage } from "@/lib/api";

export type Resource<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

/**
 * Loads data when the component mounts, and again when `reload()` is called.
 * `load` must stay the same between renders: pass a module-level function
 * (like `getMe`) or wrap it in useCallback.
 */
export function useResource<T>(load: () => Promise<T>): {
  resource: Resource<T>;
  reload: () => void;
} {
  const [resource, setResource] = useState<Resource<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0); // bumped by reload() to re-run the effect

  useEffect(() => {
    // Set on cleanup, so a run React has already discarded can't update state.
    let ignore = false;

    load()
      .then((data) => {
        if (!ignore) setResource({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!ignore) setResource({ status: "error", message: errorMessage(error) });
      });

    return () => {
      ignore = true;
    };
  }, [load, attempt]);

  const reload = useCallback(() => {
    // Data already on screen stays there while it refreshes; an error goes back to loading.
    setResource((current) => (current.status === "error" ? { status: "loading" } : current));
    setAttempt((count) => count + 1);
  }, []);

  return { resource, reload };
}
