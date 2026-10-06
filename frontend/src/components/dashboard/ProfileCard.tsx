"use client";

import { Avatar } from "@/components/layout/Avatar";
import { useCurrentUser } from "@/components/layout/CurrentUserProvider";
import { Card } from "@/components/ui/Card";

/** The signed-in user's card at the top of Home. */
export function ProfileCard() {
  const user = useCurrentUser();

  return (
    <Card className="flex min-h-32 items-center gap-5 p-6">
      {user !== null && (
        <>
          <Avatar
            name={user.name}
            color={user.avatar_color}
            className="size-20 rounded-xl text-[40px]"
          />
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold text-zoom-navy">{user.name}</h2>
            <p className="mt-1 text-[15px] text-text-secondary">
              Plan: <span className="text-text-primary">Workplace Basic</span>
            </p>
          </div>
        </>
      )}
    </Card>
  );
}
