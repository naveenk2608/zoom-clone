"use client";

import { Settings, User } from "lucide-react";

import { Avatar } from "@/components/layout/Avatar";
import { useCurrentUser } from "@/components/layout/CurrentUserProvider";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { NOT_AVAILABLE } from "@/components/ui/Tooltip";

/** The avatar at the right of the top nav. Profile and Settings are placeholders. */
export function AvatarMenu() {
  const user = useCurrentUser();
  const showToast = useToast();

  if (user === null) {
    return <span aria-hidden="true" className="size-8 rounded-lg bg-btn-disabled" />;
  }

  return (
    <Menu>
      <MenuTrigger asChild>
        <button type="button" aria-label="Open profile menu" className="rounded-lg">
          <Avatar
            name={user.name}
            color={user.avatar_color}
            className="size-8 rounded-lg text-lg"
          />
        </button>
      </MenuTrigger>
      <MenuContent>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar
            name={user.name}
            color={user.avatar_color}
            className="size-10 rounded-lg text-xl"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-text-secondary">{user.email}</p>
          </div>
        </div>
        <MenuSeparator />
        <MenuItem icon={User} label="Profile" onSelect={() => showToast(NOT_AVAILABLE)} />
        <MenuItem icon={Settings} label="Settings" onSelect={() => showToast(NOT_AVAILABLE)} />
      </MenuContent>
    </Menu>
  );
}
