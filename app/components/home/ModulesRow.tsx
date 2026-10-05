import Link from "next/link";
import { IconArrowRight } from "@/app/components/icons";
import { ProductCard } from "@/app/components/ui/ProductCard";
import { cx } from "@/app/components/ui/cx";
import type { CatalogProduct } from "@/lib/catalog";

/**
 * BrainsAudios modules: a single row of cards (2 on phones, 3 from tablet),
 * introduced by a text column on desktop.
 */
export function ModulesRow({ products, href }: { products: CatalogProduct[]; href: string }) {
  if (!products.length) return null;
  const shown = products.slice(0, 3);
  return (
    <section aria-labelledby="home-modules" className="page-wrap pt-10 lg:pt-[72px]">
      <div className="lg:grid lg:grid-cols-4 lg:gap-5">
        <div className="flex items-end justify-between gap-6 lg:block lg:pr-6 lg:pt-1">
          <div className="min-w-0">
            <p className="type-kicker text-signal-ink">Modules &amp; boards</p>
            <h2 id="home-modules" className="type-h2 mt-1.5 text-ink">
              BrainsAudios modules
            </h2>
            <p className="mt-2 hidden max-w-[40ch] text-[15px] leading-[22px] text-ink-2 sm:block">
              Ready-made audio boards for amplifier builds: input selection, tone control and more.
            </p>
          </div>
          <Link
            href={href}
            className="group -mr-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-chip px-2 text-[14px] font-semibold text-ink hover:text-signal-ink lg:-ml-2 lg:mr-0 lg:mt-4"
          >
            View all
            <IconArrowRight size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ul role="list" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:col-span-3 lg:mt-0 lg:gap-5">
          {shown.map((product, index) => (
            <li key={product._id} className={cx("min-w-0", index === 2 && "hidden md:block")}>
              <ProductCard product={product} sizes="(min-width: 1024px) 270px, (min-width: 768px) 31vw, 46vw" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
