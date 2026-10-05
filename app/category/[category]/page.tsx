import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CategoryTabs, type CategoryTab } from "@/app/components/catalog/CategoryTabs";
import { CATEGORY_INTROS, GROUP_INTROS, GROUP_TITLES, categoryKicker, midSentence, unitNoun } from "@/app/components/catalog/copy";
import { ListingHeader } from "@/app/components/catalog/ListingHeader";
import { CategoryEmpty, FilteredEmpty } from "@/app/components/catalog/ListingEmpty";
import { ListingToolbar, type BrandChip } from "@/app/components/catalog/ListingToolbar";
import {
  applyListing,
  brandFacets,
  dedupeListings,
  listingQuery,
  readListingParams,
  type BrandFacet,
  type SearchParamsRecord,
} from "@/app/components/catalog/listing";
import type { Crumb } from "@/app/components/ui/Breadcrumbs";
import { ProductGrid } from "@/app/components/ui/ProductGrid";
import {
  getAllProducts,
  getCategoriesWithCounts,
  isDirectlyImported,
  resolveCategory,
  resolveGroup,
  trustLine,
  type CatalogProduct,
  type CategoryGroupId,
} from "@/lib/catalog";
import { formatINR } from "@/lib/format";
import { COD_ENABLED, COD_MAX_ORDER_VALUE } from "@/lib/shipping-policy";
import { DEFAULT_OPEN_GRAPH } from "@/lib/site";

// Category (/category/transistors) and department (/category/semiconductors)
// listings, server-rendered from the cached catalogue. Sort and filters live in
// the URL (?sort=price-asc&instock=1&brand=onsemi), so they work without
// JavaScript and every state can be shared. Old raw URLs such as
// /category/amplifier%20ic redirect permanently to the slug URL.
export const revalidate = 60;

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<SearchParamsRecord>;
};

type Listing = {
  kind: "category" | "department";
  /** Canonical path: /category/<slug>. */
  path: string;
  /** Set when the requested param is not the canonical slug. */
  redirectTo: string | null;
  group: CategoryGroupId;
  title: string;
  kicker: string | null;
  intro: string | null;
  trust: string;
  noun: string;
  crumbs: Crumb[];
  /** The full listing before toolbar filters (categories as listed; departments one listing per part). */
  products: CatalogProduct[];
  /** Sibling-category navigation (department + its categories), without query strings. */
  chips: CategoryTab[];
  chipsLabel: string;
  /** Brand filter chips (category pages with 2+ brands). */
  facets: BrandFacet[];
  metaTitle: string;
  metaDescription: string;
};

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const COD_LINE = COD_ENABLED ? `, COD up to ${formatINR(COD_MAX_ORDER_VALUE)}` : "";

function describe(label: string, count: number, noun: string, raw: string, group: CategoryGroupId) {
  const items = `${count} ${noun}, prices include GST`;
  const dispatch = `Same-day dispatch on most orders${COD_LINE}.`;
  if (isDirectlyImported(raw)) {
    return `Original ${midSentence(label)}, directly imported from authorised international sources: ${items}. ${dispatch}`;
  }
  if (group === "speaker-drivers") return `Genuine Peerless by Tymphany ${midSentence(label)}: ${items}. ${dispatch}`;
  return `Original ${midSentence(label)}: ${items}. ${dispatch}`;
}

function titleFor(label: string, raw: string, group: CategoryGroupId) {
  if (isDirectlyImported(raw)) return `${label} – original, directly imported`;
  if (group === "speaker-drivers") return label.startsWith("Peerless") ? label : `Peerless by Tymphany ${midSentence(label)}`;
  if (group === "more") return label;
  return `${label} – original`;
}

/** Resolve /category/[param] to a category or department listing (null = 404). */
async function loadListing(param: string): Promise<Listing | null> {
  const all = await getAllProducts();
  const departments = await getCategoriesWithCounts();
  const requested = safeDecode(param).trim();

  const info = resolveCategory(requested, [...new Set(all.map((product) => product.category))]);
  if (info) {
    const products = all.filter((product) => product.category === info.raw);
    if (!products.length && !info.known) return null;
    const department = departments.find((group) => group.id === info.group);
    const multi = Boolean(department && department.categories.length > 1);
    const noun = unitNoun(info.group, products.length);
    const crumbs: Crumb[] = [{ label: "Home", href: "/" }];
    if (department && multi) crumbs.push({ label: department.label, href: `/category/${department.slug}` });
    crumbs.push({ label: info.label });
    const chips: CategoryTab[] =
      department && multi
        ? [
            {
              label: `All ${midSentence(department.label)}`,
              href: `/category/${department.slug}`,
              count: dedupeListings(all.filter((product) => product.categoryGroup === department.id)).length,
            },
            ...department.categories.map((category) => ({
              label: category.label,
              href: category.href,
              count: category.count,
              active: category.raw === info.raw,
            })),
          ]
        : [];
    const facets = brandFacets(products);
    return {
      kind: "category",
      path: info.href,
      redirectTo: requested === info.slug ? null : info.href,
      group: info.group,
      title: info.label,
      kicker: categoryKicker(info.group, info.groupLabel),
      intro: CATEGORY_INTROS[info.raw] ?? null,
      trust: trustLine(info.raw),
      noun,
      crumbs,
      products,
      chips,
      chipsLabel: `${department?.label ?? info.groupLabel} categories`,
      facets: facets.length >= 2 ? facets : [],
      metaTitle: titleFor(info.label, info.raw, info.group),
      metaDescription: describe(info.label, products.length, noun, info.raw, info.group),
    };
  }

  const match = resolveGroup(requested);
  if (!match) return null;
  const department = departments.find((group) => group.id === match.id);
  if (!department) return null;
  const path = `/category/${department.slug}`;
  // A department with a single category is that category (Modules & boards -> BrainsAudios).
  if (department.categories.length === 1) {
    const only = await loadListing(department.categories[0].slug);
    return only ? { ...only, redirectTo: only.path } : null;
  }
  const raws = new Set(department.categories.map((category) => category.raw));
  const products = dedupeListings(all.filter((product) => raws.has(product.category)));
  const firstRaw = department.categories[0]?.raw ?? "";
  const title = GROUP_TITLES[department.id] ?? department.label;
  const noun = unitNoun(department.id, products.length);
  return {
    kind: "department",
    path,
    redirectTo: requested === department.slug ? null : path,
    group: department.id,
    title,
    kicker: null,
    intro: GROUP_INTROS[department.id] ?? null,
    trust: trustLine(firstRaw),
    noun,
    crumbs: [{ label: "Home", href: "/" }, { label: department.label }],
    products,
    chips: [
      { label: `All ${midSentence(department.label)}`, href: path, count: products.length, active: true },
      ...department.categories.map((category) => ({ label: category.label, href: category.href, count: category.count })),
    ],
    chipsLabel: `${department.label} categories`,
    facets: [],
    metaTitle: titleFor(title, firstRaw, department.id),
    metaDescription: describe(department.id === "speaker-drivers" ? "speaker drivers" : department.label, products.length, noun, firstRaw, department.id),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const listing = await loadListing(category);
  if (!listing) return { title: "Category not found", robots: { index: false, follow: true } };
  return {
    title: listing.metaTitle,
    description: listing.metaDescription,
    alternates: { canonical: listing.redirectTo ?? listing.path },
    openGraph: {
      ...DEFAULT_OPEN_GRAPH,
      url: listing.redirectTo ?? listing.path,
      title: listing.metaTitle,
      description: listing.metaDescription,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const [{ category }, query] = await Promise.all([params, searchParams]);
  const listing = await loadListing(category);
  if (!listing) notFound();

  const state = readListingParams(query);
  if (listing.redirectTo) permanentRedirect(`${listing.redirectTo}${listingQuery(state)}`);

  const { brand, products } = applyListing(listing.products, state, listing.facets);
  const total = listing.products.length;
  // Sort and in-stock carry over to sibling categories; a brand belongs to this page only.
  const keep = { sort: state.sort, inStock: state.inStock };
  const tabs = listing.chips.map((chip) => ({ ...chip, href: `${chip.href}${listingQuery(keep)}` }));
  const brandChips: BrandChip[] = listing.facets.map((facet) => ({
    label: facet.label,
    count: facet.count,
    // Tapping the active brand again clears it.
    href: `${listing.path}${listingQuery({ ...keep, brand: brand === facet.slug ? null : facet.slug })}`,
    active: brand === facet.slug,
  }));
  const plural = unitNoun(listing.group, 2);
  const hasTabs = tabs.length > 1;

  return (
    <main className="page-wrap flex-1 pb-14 pt-1 lg:pb-20 lg:pt-3">
      <ListingHeader
        crumbs={listing.crumbs}
        kicker={listing.kicker}
        title={listing.title}
        count={total}
        noun={listing.noun}
        intro={listing.intro}
        trust={total ? listing.trust : null}
      />

      {hasTabs ? <CategoryTabs id="category-tabs" className="mt-4 lg:mt-6" label={listing.chipsLabel} tabs={tabs} /> : null}

      {total ? (
        <ListingToolbar
          className={hasTabs ? "mt-3 lg:mt-4" : "mt-5 lg:mt-6"}
          action={listing.path}
          params={state}
          brand={brand}
          brands={brandChips}
          total={total}
          shown={products.length}
          noun={plural}
        />
      ) : null}

      <div id="listing-results" className="mt-4 transition-opacity duration-150 aria-busy:opacity-60 lg:mt-6">
        {products.length ? (
          <ProductGrid products={products} priorityCount={2} headingLevel="h2" />
        ) : total ? (
          <FilteredEmpty clearHref={listing.path} total={total} noun={plural} />
        ) : (
          <CategoryEmpty label={listing.title} />
        )}
      </div>
    </main>
  );
}
