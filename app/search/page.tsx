import type { Metadata } from "next";
import Link from "next/link";
import { withSafeImage } from "@/app/components/catalog/images";
import { dedupeListings, firstParam, isBuyable, type SearchParamsRecord } from "@/app/components/catalog/listing";
import { DepartmentLinks } from "@/app/components/chrome/DepartmentLinks";
import { SearchForm } from "@/app/components/chrome/SearchForm";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";
import { IconArrowRight, IconCheckCircle, IconSearch, IconWhatsApp } from "@/app/components/icons";
import { buttonClasses } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ProductGrid } from "@/app/components/ui/ProductGrid";
import {
  MOST_FAKED_PARTS,
  getAllProducts,
  matchesPart,
  normalizeQuery,
  resolveCategory,
  resolveGroup,
  searchProducts,
  sortProducts,
  stripQueryNoise,
  type CatalogProduct,
} from "@/lib/catalog";
import { formatNumber } from "@/lib/format";
import { whatsappLink } from "@/lib/site";

// /search?q= — server-rendered results from the cached catalogue (lib/search:
// part numbers match loosely, "original"/"genuine" are treated as noise).
// Results pages are not indexed.
export const revalidate = 60;

type PageProps = { searchParams: Promise<SearchParamsRecord> };

function readQuery(value: string | string[] | undefined) {
  return firstParam(value).replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const q = readQuery((await searchParams).q);
  return {
    title: q ? `Search: ${q}` : "Search parts",
    robots: { index: false, follow: true },
  };
}

/** Most-searched originals that are buyable now, as quick links. */
function popularParts(all: CatalogProduct[]) {
  const pool = sortProducts(all.filter(isBuyable), "featured");
  const out: CatalogProduct[] = [];
  for (const part of MOST_FAKED_PARTS) {
    const hit = pool.find((product) => matchesPart(product.name, part) && !out.includes(product));
    if (hit) out.push(hit);
  }
  return dedupeListings(out);
}

function PopularParts({ products, className }: { products: CatalogProduct[]; className?: string }) {
  if (!products.length) return null;
  return (
    <nav aria-labelledby="search-popular" className={className}>
      <h2 id="search-popular" className="type-kicker text-muted">
        Popular originals
      </h2>
      <ul role="list" className="mt-3 flex flex-wrap gap-2">
        {products.map((product) => (
          <li key={product._id}>
            <Link
              href={product.href}
              className="inline-flex h-11 items-center rounded-full border border-line-strong bg-card px-4 font-mono text-[13px] font-medium text-ink-2 hover:border-ink hover:text-ink"
            >
              {product.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default async function SearchPage({ searchParams }: PageProps) {
  const q = readQuery((await searchParams).q);
  const all = await getAllProducts();

  if (!q) {
    return (
      <main className="page-wrap flex-1 pb-14 pt-6 lg:pb-20 lg:pt-10">
        <div className="max-w-[720px]">
          <h1 className="type-h1 text-ink">Search parts</h1>
          <p className="mt-2 text-[15px] leading-[22px] text-ink-2">
            Search by part number, brand or category. Spaces and dashes don’t matter: “2sc 5200” finds 2SC5200.
          </p>
          <SearchForm className="mt-5" autoFocus />
          <PopularParts products={popularParts(all)} className="mt-8" />
        </div>
        <section aria-labelledby="search-departments" className="mt-10 max-w-[720px] rounded-sheet border border-line bg-card p-5 sm:p-7">
          <h2 id="search-departments" className="type-h3 text-ink">
            Browse departments
          </h2>
          <DepartmentLinks className="mt-5" headingLevel="h3" />
        </section>
      </main>
    );
  }

  const results = dedupeListings(searchProducts(all, q)).map(withSafeImage);
  const cleaned = stripQueryNoise(q);
  const noiseRemoved = normalizeQuery(cleaned) !== normalizeQuery(q);
  const rawCategories = [...new Set(all.map((product) => product.category))];
  // A category shortcut when the query names one ("transistor") or every result shares one ("TDA").
  const sharedRaw = results.length && results.every((product) => product.category === results[0].category) ? results[0].category : null;
  const category = resolveCategory(cleaned, rawCategories) ?? (sharedRaw ? resolveCategory(sharedRaw, rawCategories) : null);
  const group = category ? null : resolveGroup(cleaned);
  const shortcut = category
    ? { label: category.label, href: category.href, count: all.filter((product) => product.category === category.raw).length }
    : group && group.slug !== "more"
      ? {
          label: group.label,
          href: `/category/${group.slug}`,
          count: dedupeListings(all.filter((product) => product.categoryGroup === group.id)).length,
        }
      : null;

  return (
    <main className="page-wrap flex-1 pb-14 pt-4 lg:pb-20 lg:pt-6">
      <SearchForm defaultValue={q} className="max-w-[640px]" />

      {results.length ? (
        <>
          <header className="mt-6 lg:mt-8">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="type-h1 break-words text-ink">Results for “{q}”</h1>
              <p className="font-mono text-[13px] font-medium leading-5 text-muted tabular">
                {formatNumber(results.length)} {results.length === 1 ? "part" : "parts"}
              </p>
            </div>
            {noiseRemoved ? (
              <p className="mt-2.5 flex items-start gap-1.5 text-[14px] font-medium leading-5 text-ok">
                <IconCheckCircle size={18} className="mt-px shrink-0" />
                Everything we sell is original, so we searched for “{cleaned}”.
              </p>
            ) : null}
          </header>

          {shortcut && shortcut.count > 0 ? (
            <Link
              href={shortcut.href}
              className="group mt-4 flex min-h-12 max-w-[640px] items-center justify-between gap-3 rounded-card border border-line bg-card px-4 py-3 text-[15px] hover:border-ink"
            >
              <span className="min-w-0">
                <span className="font-semibold text-ink">Browse all {shortcut.label}</span>
                <span className="ml-2 font-mono text-[13px] text-muted tabular">{formatNumber(shortcut.count)}</span>
              </span>
              <IconArrowRight size={18} className="shrink-0 text-ink transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          ) : null}

          <ProductGrid products={results} priorityCount={2} headingLevel="h2" className="mt-5 lg:mt-7" />
        </>
      ) : (
        <EmptyState
          as="h1"
          icon={<IconSearch />}
          title={`No parts match “${q}”`}
          description="Check the part number (try it without spaces or dashes), or ask us: we may be able to source it."
          className="max-w-xl pb-6"
          action={
            <WhatsAppLink
              href={whatsappLink(`Hi CrazyAudios, I'm looking for ${q}. Do you have it, or can you source it?`)}
              source="search_no_results"
              className={buttonClasses({ variant: "outline", size: "lg" })}
            >
              <IconWhatsApp size={20} className="text-whatsapp" />
              Ask us for this part
            </WhatsAppLink>
          }
        >
          <PopularParts products={popularParts(all)} className="text-left" />
        </EmptyState>
      )}

      {!results.length ? (
        <section aria-labelledby="search-departments" className="mx-auto max-w-[720px] rounded-sheet border border-line bg-card p-5 sm:p-7">
          <h2 id="search-departments" className="type-h3 text-ink">
            Browse departments
          </h2>
          <DepartmentLinks className="mt-5" headingLevel="h3" />
        </section>
      ) : null}
    </main>
  );
}
