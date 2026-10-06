"use client";

import { JoinForm } from "@/components/join/JoinForm";
import { PortalLayout } from "@/components/layout/PortalLayout";

/** Join Meeting: enter a meeting ID or paste an invite link. */
export default function JoinPage() {
  return (
    <PortalLayout withSidebar={false}>
      <div className="flex flex-col items-center px-4 pt-16 pb-16 md:pt-30">
        <h1 className="text-2xl font-bold text-text-primary">Join Meeting</h1>
        <div className="mt-12 flex w-full justify-center">
          <JoinForm />
        </div>
      </div>
    </PortalLayout>
  );
}
