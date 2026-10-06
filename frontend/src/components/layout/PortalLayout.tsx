import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

type PortalLayoutProps = {
  withSidebar?: boolean; // the Join page has no sidebar, as in Zoom
  children: ReactNode;
};

/** The frame of every web-portal page: top nav, optional sidebar, content. */
export function PortalLayout({ withSidebar = true, children }: PortalLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <div className="flex flex-1">
        {withSidebar && <Sidebar />}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
