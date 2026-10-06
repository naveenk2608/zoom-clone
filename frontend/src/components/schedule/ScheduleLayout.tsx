import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { PortalLayout } from "@/components/layout/PortalLayout";

type ScheduleLayoutProps = {
  title: string;
  children: ReactNode;
};

/** The frame shared by the Schedule and Edit pages: back link and heading. */
export function ScheduleLayout({ title, children }: ScheduleLayoutProps) {
  return (
    <PortalLayout>
      <div className="max-w-295 px-4 py-6 md:px-8 md:py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded text-[15px] text-zoom-blue hover:underline"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Back to Meetings
        </Link>
        <h1 className="mt-7 text-xl font-bold text-zoom-navy">{title}</h1>
        <div className="mt-8">{children}</div>
      </div>
    </PortalLayout>
  );
}
