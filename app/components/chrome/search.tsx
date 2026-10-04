"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import type { SearchSuggestion } from "@/lib/search";
import { formatINR } from "@/lib/format";
import { trackPixelEvent } from "@/lib/meta-pixel";
import { IconArrowRight, IconSearch, IconWhatsApp } from "@/app/components/icons";
import { ProductImage } from "@/app/components/ui/ProductImage";
import { stockLevel } from "@/app/components/ui/StockStatus";
import { cx } from "@/app/components/ui/cx";
import { WHATSAPP_DISPLAY } from "./links";
import { whatsappLink } from "@/lib/site";

export type SearchStatus = "idle" | "loading" | "ready" | "error";
type Result = { results: SearchSuggestion[]; total: number };
type State = Result & { query: string; status: SearchStatus };

const IDLE: State = { query: "", results: [], total: 0, status: "idle" };

/** Instant suggestions from /api/search, debounced, cached per query, aborts stale requests. */
export function useSearchSuggestions(query: string, delay = 140) {
  const [state, setState] = useState<State>(IDLE);
  const cache = useRef(new Map<string, Result>());
  const trimmed = query.trim();

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const key = q.toLowerCase();
    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        const hit = cache.current.get(key);
        if (hit) {
          setState({ query: q, ...hit, status: "ready" });
          return;
        }
        setState((previous) => ({ ...previous, query: q, status: "loading" }));
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
          const data = (await response.json()) as Partial<Result>;
          if (!response.ok) throw new Error("search failed");
          const entry: Result = { results: Array.isArray(data.results) ? data.results : [], total: Number(data.total) || 0 };
          cache.current.set(key, entry);
          setState({ query: q, ...entry, status: "ready" });
        } catch {
          if (controller.signal.aborted) return;
          setState({ query: q, results: [], total: 0, status: "error" });
        }
      },
      cache.current.has(key) ? 0 : delay
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, delay]);

  if (!trimmed) return IDLE;
  // Typing ahead of the response: keep showing the last results, marked as loading.
  if (state.query.toLowerCase() !== trimmed.toLowerCase()) return { ...state, query: trimmed, status: "loading" as const };
  return state;
}

/** Arrow-key movement between the input and result links. */
export function moveFocus(event: KeyboardEvent<HTMLElement>, list: RefObject<HTMLElement | null>, input: RefObject<HTMLInputElement | null>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const links = Array.from(list.current?.querySelectorAll<HTMLAnchorElement>("a[data-result]") ?? []);
  if (!links.length) return;
  const index = links.indexOf(document.activeElement as HTMLAnchorElement);
  event.preventDefault();
  if (event.key === "ArrowDown") {
    links[Math.min(links.length - 1, index + 1)]?.focus();
  } else if (index <= 0) {
    input.current?.focus();
  } else {
    links[index - 1]?.focus();
  }
}

export const POPULAR_PARTS = ["2SC5200", "TDA7294", "TIP35", "NE5532", "TPA3255", "LM1875", "2SA1943", "TL072"];

const QUICK_DEPARTMENTS = [
  { label: "Amplifier ICs", href: "/category/amplifier-ics" },
  { label: "Transistors", href: "/category/transistors" },
  { label: "Op-amps", href: "/category/op-amps" },
  { label: "MOSFETs", href: "/category/mosfets" },
  { label: "Capacitors", href: "/category/capacitors" },
  { label: "Speaker drivers", href: "/category/speaker-drivers" },
];

function stockText(item: SearchSuggestion) {
  const { level, count } = stockLevel(item.stock, item.packSize);
  if (level === "out") return { text: "Out of stock", tone: "text-danger" };
  if (level === "low") return { text: `Only ${count} left`, tone: "text-warn" };
  return { text: "In stock", tone: "text-ok" };
}

function ResultRow({ item, onNavigate }: { item: SearchSuggestion; onNavigate: () => void }) {
  const stock = stockText(item);
  const subtitle = [item.packSize > 1 ? `Pack of ${item.packSize}` : "", item.descriptor || item.brand || item.categoryLabel]
    .filter(Boolean)
    .join(" · ");
  return (
    <li>
      <Link
        href={item.href}
        prefetch={false}
        data-result=""
        onClick={onNavigate}
        className="flex min-h-16 items-center gap-3 rounded-card px-2 py-2 outline-none hover:bg-paper focus-visible:bg-paper focus-visible:shadow-[inset_0_0_0_2px_var(--color-signal-ink)]"
      >
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-chip border border-line bg-card">
          <ProductImage src={item.image} alt="" fill sizes="48px" className="object-contain p-1" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-5 text-ink">{item.name}</span>
          <span className="block truncate text-[13px] leading-[18px] text-muted">{subtitle}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[15px] font-bold leading-5 text-ink tabular">{formatINR(item.displayPrice)}</span>
          <span className={cx("block text-[12px] font-medium leading-4", stock.tone)}>{stock.text}</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Suggestion list for the header search (sheet on phones, dropdown on
 * desktop): popular parts when empty, up to 6 results, a "See all" link,
 * and a helpful empty state.
 */
export function SearchResults({
  query,
  state,
  listRef,
  onNavigate,
  onPick,
  limit = 6,
}: {
  query: string;
  state: ReturnType<typeof useSearchSuggestions>;
  listRef: RefObject<HTMLDivElement | null>;
  onNavigate: () => void;
  /** Fill the input with a popular part number. */
  onPick: (term: string) => void;
  limit?: number;
}) {
  const q = query.trim();
  const shown = state.results.slice(0, limit);
  const searchHref = `/search?q=${encodeURIComponent(q)}`;
  const announce =
    state.status === "ready"
      ? state.total
        ? `${state.total} ${state.total === 1 ? "part" : "parts"} found`
        : `No parts match ${q}`
      : "";

  return (
    <div ref={listRef}>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {state.status === "idle" ? (
        <div className="px-2 py-3">
          <p className="type-kicker text-muted">Popular parts</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {POPULAR_PARTS.map((part) => (
              <button
                key={part}
                type="button"
                onClick={() => onPick(part)}
                className="inline-flex h-10 items-center rounded-full border border-line-strong bg-card px-3.5 font-mono text-[13px] font-medium text-ink-2 hover:border-ink hover:text-ink"
              >
                {part}
              </button>
            ))}
          </div>
          <p className="type-kicker mt-6 text-muted">Departments</p>
          <ul className="mt-1 grid grid-cols-2 gap-x-4">
            {QUICK_DEPARTMENTS.map((department) => (
              <li key={department.href}>
                <Link
                  href={department.href}
                  prefetch={false}
                  onClick={onNavigate}
                  className="flex min-h-11 items-center justify-between border-b border-line text-[15px] font-medium text-ink hover:text-signal-ink"
                >
                  {department.label}
                  <IconArrowRight size={16} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.status !== "idle" && shown.length > 0 ? (
        <div className={cx("transition-opacity duration-150", state.status === "loading" && "opacity-60")}>
          <ul role="list" aria-label="Suggestions" className="py-1">
            {shown.map((item) => (
              <ResultRow key={item.id} item={item} onNavigate={onNavigate} />
            ))}
          </ul>
          <Link
            href={searchHref}
            prefetch={false}
            data-result=""
            onClick={onNavigate}
            className="mx-2 mt-1 flex min-h-12 items-center justify-between gap-2 rounded-card border border-line px-3 text-[14px] font-semibold text-ink outline-none hover:border-ink focus-visible:border-signal-ink"
          >
            <span className="truncate">
              {state.total > shown.length ? `See all ${state.total} results for “${q}”` : `Search all products for “${q}”`}
            </span>
            <IconArrowRight size={18} className="shrink-0" />
          </Link>
        </div>
      ) : null}

      {state.status === "loading" && shown.length === 0 ? (
        <ul aria-hidden="true" className="py-1">
          {[0, 1, 2].map((row) => (
            <li key={row} className="flex min-h-16 items-center gap-3 px-2 py-2">
              <span className="h-12 w-12 shrink-0 rounded-chip bg-line/70" />
              <span className="flex-1 space-y-2">
                <span className="block h-3.5 w-2/3 rounded-chip bg-line/70" />
                <span className="block h-3 w-1/3 rounded-chip bg-line/70" />
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {state.status === "ready" && shown.length === 0 ? (
        <div className="px-2 py-4">
          <p className="text-[16px] font-semibold text-ink">No parts match “{q}”</p>
          <p className="mt-1 text-[14px] leading-5 text-ink-2">
            Check the part number (try without spaces or dashes), or ask us — we may be able to source it.
          </p>
          <a
            href={whatsappLink(`Hi CrazyAudios, do you have ${q}?`)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackPixelEvent("Contact", { content_name: "WhatsApp chat", content_category: "search_no_results" })}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-card border border-line-strong px-3.5 text-[14px] font-semibold text-ink hover:border-ink"
          >
            <IconWhatsApp size={18} className="text-whatsapp" />
            Ask on WhatsApp · {WHATSAPP_DISPLAY}
          </a>
          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_DEPARTMENTS.map((department) => (
              <Link
                key={department.href}
                href={department.href}
                prefetch={false}
                onClick={onNavigate}
                className="inline-flex h-10 items-center rounded-full border border-line px-3.5 text-[14px] font-medium text-ink-2 hover:border-ink hover:text-ink"
              >
                {department.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="px-2 py-4">
          <p className="text-[15px] font-semibold text-ink">Instant search is unavailable right now.</p>
          <Link
            href={searchHref}
            prefetch={false}
            onClick={onNavigate}
            className="mt-2 inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold text-signal-ink underline-offset-4 hover:underline"
          >
            <IconSearch size={18} />
            Search the catalogue for “{q}”
          </Link>
        </div>
      ) : null}
    </div>
  );
}
