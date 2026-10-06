import Link from "next/link";

import { AvatarMenu } from "@/components/layout/AvatarMenu";
import { NotAvailable } from "@/components/ui/Tooltip";

// Zoom's marketing links. Shown on wide screens only, as placeholders.
const MARKETING_LINKS = ["Products", "Solutions", "Resources", "Plans & Pricing"];

const NAV_ITEM_CLASSES = "rounded text-base font-semibold text-zoom-navy/80 hover:text-zoom-blue";

/** The white top bar of the web portal. */
export function TopNav() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center border-b border-black/10 bg-white px-4 md:px-6">
      {/* A plain text wordmark in Zoom's blue, not Zoom's logo file. */}
      <Link
        href="/"
        aria-label="Zoom home"
        className="rounded text-[42px] leading-none font-bold tracking-[-0.06em] text-zoom-blue-title"
      >
        zoom
      </Link>

      <nav aria-label="Zoom website" className="ml-10 hidden items-center gap-9 lg:flex">
        {MARKETING_LINKS.map((label) => (
          <NotAvailable key={label}>
            <button
              type="button"
              aria-disabled="true"
              className="rounded text-base font-medium text-zoom-navy/70"
            >
              {label}
            </button>
          </NotAvailable>
        ))}
      </nav>

      <nav aria-label="Meetings" className="ml-auto flex items-center gap-4 md:gap-8">
        <Link href="/schedule" className={NAV_ITEM_CLASSES}>
          Schedule
        </Link>
        <Link href="/join" className={NAV_ITEM_CLASSES}>
          Join
        </Link>
        <NotAvailable>
          <button type="button" aria-disabled="true" className={NAV_ITEM_CLASSES}>
            Host
          </button>
        </NotAvailable>
        <AvatarMenu />
      </nav>
    </header>
  );
}
