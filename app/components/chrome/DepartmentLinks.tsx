import Link from "next/link";
import { CATEGORY_GROUPS, categoryInfo } from "@/lib/categories";
import { IconArrowRight } from "@/app/components/icons";
import { cx } from "@/app/components/ui/cx";

/**
 * Static department directory (no database): used on the 404 and error
 * pages and empty states, so it renders even when the catalogue is down.
 */
export function DepartmentLinks({ className, headingLevel = "h2" }: { className?: string; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <div className={cx("grid gap-x-8 gap-y-6 text-left sm:grid-cols-2", className)}>
      {CATEGORY_GROUPS.filter((group) => group.categories.length > 0).map((group) => (
        <section key={group.id}>
          <Heading className="type-kicker border-b border-line pb-2 text-muted">{group.label}</Heading>
          <ul>
            {group.categories.map((raw) => {
              const info = categoryInfo(raw);
              return (
                <li key={raw}>
                  <Link
                    href={info.href}
                    className="group flex min-h-11 items-center justify-between border-b border-line text-[15px] font-medium text-ink hover:text-signal-ink"
                  >
                    {info.label}
                    <IconArrowRight size={16} className="text-muted transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-signal-ink" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
