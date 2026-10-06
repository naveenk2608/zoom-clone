"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NotAvailable } from "@/components/ui/Tooltip";

// Zoom products this demo doesn't have. They are shown so the sidebar looks like Zoom's.
const PLACEHOLDER_PRODUCTS = ["Recordings", "Summaries", "Whiteboards", "Notes", "Clips"];

const ITEM_CLASSES = "rounded-md py-2 pl-7 text-left text-[15px]";

/** The left sidebar of the web portal. Hidden on small screens. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-75 shrink-0 bg-surface-muted md:block">
      <nav aria-label="Main" className="sticky top-16 flex flex-col px-2 py-3">
        <SidebarLink href="/" label="Home" active={pathname === "/"} />
        <p className="mt-4 mb-1 px-1 text-xs text-text-secondary">My Products</p>
        {/* The meetings list lives on Home in this demo, so Meetings links there.
            It is highlighted on the Schedule pages, as in Zoom. */}
        <SidebarLink href="/" label="Meetings" active={pathname.startsWith("/schedule")} />
        {PLACEHOLDER_PRODUCTS.map((label) => (
          <NotAvailable key={label}>
            <button type="button" aria-disabled="true" className={ITEM_CLASSES}>
              {label}
            </button>
          </NotAvailable>
        ))}
      </nav>
    </aside>
  );
}

type SidebarLinkProps = {
  href: string;
  label: string;
  active: boolean;
};

function SidebarLink({ href, label, active }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        ITEM_CLASSES,
        active ? "bg-surface-active text-zoom-blue" : "hover:text-zoom-blue",
      )}
    >
      {label}
    </Link>
  );
}
