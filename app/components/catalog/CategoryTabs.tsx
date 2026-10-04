import Link from "next/link";
import { cx } from "@/app/components/ui/cx";
import { KeepActiveInView } from "./KeepActiveInView";

export type CategoryTab = {
  label: string;
  href: string;
  count?: number;
  active?: boolean;
};

/**
 * Department navigation as underline tabs: "All semiconductors · Amplifier ICs
 * · Transistors · …". Plain links (no JavaScript needed); they scroll sideways
 * on phones, and the active tab is brought into view on load.
 */
export function CategoryTabs({ id, label, tabs, className }: { id: string; label: string; tabs: CategoryTab[]; className?: string }) {
  if (tabs.length < 2) return null;
  return (
    <nav aria-label={label} className={cx("[contain:inline-size]", className)}>
      <ul
        id={id}
        role="list"
        className="no-scrollbar relative -mx-4 flex gap-6 overflow-x-auto border-b border-line px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:gap-7 lg:px-0"
      >
        {tabs.map((tab) => (
          <li key={tab.href} className="shrink-0">
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cx(
                "relative inline-flex h-12 items-center gap-1.5 whitespace-nowrap rounded-chip text-[15px] leading-5 transition-colors duration-150",
                "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:content-['']",
                tab.active ? "font-semibold text-ink after:bg-signal-ink" : "font-medium text-ink-2 hover:text-ink after:bg-transparent"
              )}
            >
              {tab.label}
              {typeof tab.count === "number" ? <span className="font-mono text-[12px] font-normal text-muted tabular">{tab.count}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
      <KeepActiveInView listId={id} />
    </nav>
  );
}
