import { cx } from "@/app/components/ui/cx";

export type ContentsItem = { id: string; label: string };

/** "01", "02", … for section numbers and the contents list. */
export function sectionNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

/**
 * "On this page" anchor list for long pages, numbered like datasheet
 * sections. Plain in-page links: works without JavaScript.
 */
export function PageContents({
  items,
  title = "On this page",
  className,
}: {
  items: ContentsItem[];
  title?: string;
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <nav aria-label={title} className={cx("rounded-card border border-line bg-card py-2", className)}>
      <p className="type-kicker px-4 pb-1 pt-2 text-muted">{title}</p>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="group flex min-h-11 items-center gap-3 px-4 py-2 text-[15px] leading-5 text-ink transition-colors duration-150 hover:text-signal-ink"
            >
              <span className="type-mono w-5 shrink-0 text-[12px] text-muted tabular group-hover:text-signal-ink">
                {sectionNumber(index)}
              </span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
