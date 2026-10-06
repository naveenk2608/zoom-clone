"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useResource } from "@/hooks/useResource";
import { getMe } from "@/lib/api";
import type { UserOut } from "@/types/api";

// null until /api/me has loaded (or if it failed).
const CurrentUserContext = createContext<UserOut | null>(null);

/** Loads the signed-in (default) user once, for every page below it. */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { resource } = useResource(getMe);
  const user = resource.status === "ready" ? resource.data : null;

  return <CurrentUserContext value={user}>{children}</CurrentUserContext>;
}

export function useCurrentUser(): UserOut | null {
  return useContext(CurrentUserContext);
}
