import Link from "next/link";
import { absoluteUrl } from "@/lib/site";
import { cx } from "./cx";

export type Crumb = { label: string; href?: string };

/**
 * "Home / Amplifier ICs / LM3886". The last item is the current page.
 * jsonLd adds schema.org BreadcrumbList markup.
 *
 *   <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Amplifier ICs", href: "/category/amplifier-ics" }, { label: "LM3886" }]} jsonLd />
 */
export function Breadcrumbs({ items, jsonLd = false, className }: { items: Crumb[]; jsonLd?: boolean; className?: string }) {
  if (!items.length) return null;
  const data = jsonLd
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.label,
          ...(item.href ? { item: absoluteUrl(item.href) } : null),
        })),
      }
    : null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[13px] leading-5 text-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className={cx("flex min-w-0 items-center gap-x-1.5", last && "max-w-full")}>
              {last || !item.href ? (
                <span aria-current={last ? "page" : undefined} className={cx("truncate py-2", last && "font-medium text-ink")}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="py-2 underline-offset-4 hover:text-ink hover:underline">
                  {item.label}
                </Link>
              )}
              {!last ? (
                <span aria-hidden="true" className="text-line-strong">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {data ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
        />
      ) : null}
    </nav>
  );
}
