"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { flushSync } from "react-dom";
import { trackPixelEvent } from "@/lib/meta-pixel";
import { useCart } from "@/app/components/cart/CartProvider";
import {
  IconBag,
  IconChevronRight,
  IconClose,
  IconLogout,
  IconMenu,
  IconPackage,
  IconSearch,
  IconShield,
  IconUser,
  IconWhatsApp,
} from "@/app/components/icons";
import { CountBadge, IconButton, IconButtonLink } from "@/app/components/ui/IconButton";
import { LogoMark } from "@/app/components/ui/LogoMark";
import { Sheet } from "@/app/components/ui/Sheet";
import { cx } from "@/app/components/ui/cx";
import { HELP_LINKS, SUPPORT_HOURS, WHATSAPP_DISPLAY, WHATSAPP_HELP_URL, WHY_GENUINE_HREF } from "./links";
import { SearchResults, moveFocus, useSearchSuggestions } from "./search";

/** Slim department data the server layout passes to the menu. */
export type NavDepartment = {
  id: string;
  label: string;
  href: string;
  count: number;
  categories: Array<{ label: string; href: string; count: number }>;
};

type ChromeApi = {
  openMenu: () => void;
  openSearch: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
};

const ChromeContext = createContext<ChromeApi | null>(null);

function useChrome() {
  const value = useContext(ChromeContext);
  if (!value) throw new Error("Header controls must be rendered inside <ChromeProvider>.");
  return value;
}

/**
 * Owns the header's menu and search sheets so any header button can open
 * them. Wraps the (server-rendered) header markup.
 */
export function ChromeProvider({
  departments,
  countsLive,
  children,
}: {
  departments: NavDepartment[];
  countsLive: boolean;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuTriggerRef = useRef<HTMLElement | null>(null);
  const searchTriggerRef = useRef<HTMLElement | null>(null);

  const openMenu = useCallback(() => {
    menuTriggerRef.current = document.activeElement as HTMLElement | null;
    setMenuOpen(true);
  }, []);

  const openSearch = useCallback(() => {
    searchTriggerRef.current = document.activeElement as HTMLElement | null;
    // Commit synchronously and focus inside the tap, so phones open the keyboard.
    flushSync(() => {
      setMenuOpen(false);
      setSearchOpen(true);
    });
    searchInputRef.current?.focus({ preventScroll: true });
  }, []);

  const api = useMemo(() => ({ openMenu, openSearch, searchInputRef }), [openMenu, openSearch]);

  return (
    <ChromeContext.Provider value={api}>
      {children}
      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        departments={departments}
        countsLive={countsLive}
        returnFocusRef={menuTriggerRef}
        onSearch={openSearch}
      />
      <SearchSheet
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        inputRef={searchInputRef}
        returnFocusRef={searchTriggerRef}
      />
    </ChromeContext.Provider>
  );
}

// ------------------------------------------------------------ header buttons

export function MenuButton({ className }: { className?: string }) {
  const { openMenu } = useChrome();
  return (
    <IconButton label="Open menu" variant="ghost-on-dark" onClick={openMenu} className={className} aria-haspopup="dialog">
      <IconMenu size={24} />
    </IconButton>
  );
}

export function SearchButton({ className }: { className?: string }) {
  const { openSearch } = useChrome();
  return (
    <IconButton label="Search parts" variant="ghost-on-dark" onClick={openSearch} className={className} aria-haspopup="dialog">
      <IconSearch size={24} />
    </IconButton>
  );
}

export function CartButton({ className }: { className?: string }) {
  const { count, ready } = useCart();
  const label = ready && count > 0 ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart";
  return (
    <IconButtonLink href="/cart" label={label} variant="ghost-on-dark" className={className} badge={ready ? <CountBadge count={count} /> : null}>
      <IconBag size={24} />
    </IconButtonLink>
  );
}

export function AccountButton({ className }: { className?: string }) {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  return (
    <IconButtonLink
      href={signedIn ? "/my-account" : "/login"}
      label={signedIn ? "My account" : "Log in"}
      variant="ghost-on-dark"
      className={className}
    >
      <IconUser size={24} />
    </IconButtonLink>
  );
}

/** Desktop department links with the current one marked. */
export function PrimaryNav({ items, className }: { items: Array<{ label: string; href: string }>; className?: string }) {
  const pathname = usePathname() || "";
  return (
    <nav aria-label="Departments" className={className}>
      <ul className="flex items-center gap-0.5">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative inline-flex h-11 items-center whitespace-nowrap rounded-chip px-2.5 text-[14px] font-medium transition-colors duration-150",
                  active ? "text-white" : "text-white/80 hover:text-white",
                  "after:absolute after:inset-x-2.5 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-signal after:opacity-0 after:transition-opacity",
                  active ? "after:opacity-100" : "hover:after:opacity-40"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop (≥1280px) inline search field with a suggestions dropdown. */
export function HeaderSearchField({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const state = useSearchSuggestions(query);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div
      ref={wrapRef}
      className={cx("relative", className)}
      onBlur={(event) => {
        if (!wrapRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <form role="search" action="/search" method="get" onSubmit={submit}>
        <label htmlFor="header-search" className="sr-only">
          Search parts
        </label>
        <IconSearch size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
        <input
          ref={inputRef}
          id="header-search"
          name="q"
          type="search"
          value={query}
          placeholder="Search parts, e.g. 2SC5200"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => moveFocus(event, listRef, inputRef)}
          className="h-11 w-full rounded-card border border-white/15 bg-white/[0.07] pl-10 pr-3 text-[15px] text-white placeholder:text-white/55 outline-none transition-colors duration-150 hover:border-white/30 focus:border-white/60 focus:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal"
        />
      </form>
      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 max-h-[min(560px,calc(100dvh-96px))] w-[440px] overflow-y-auto rounded-sheet border border-line bg-card p-2 text-ink shadow-raised"
          onKeyDown={(event) => moveFocus(event, listRef, inputRef)}
          // Keep focus in the field while clicking inside the panel (Safari does not focus buttons on click).
          onMouseDown={(event) => event.preventDefault()}
        >
          <SearchResults
            query={query}
            state={state}
            listRef={listRef}
            onNavigate={() => setOpen(false)}
            onPick={(term) => {
              setQuery(term);
              inputRef.current?.focus();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------ sheets

function SearchSheet({
  open,
  onClose,
  inputRef,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const state = useSearchSuggestions(query);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Search parts"
      mobile="top"
      desktop="top"
      size="lg"
      initialFocusRef={inputRef}
      returnFocusRef={returnFocusRef}
      bodyClassName="px-2 pb-3 lg:px-3"
      header={
        <form role="search" action="/search" method="get" onSubmit={submit} className="flex shrink-0 items-center gap-1 border-b border-line py-2 pl-3 pr-1.5">
          <label htmlFor="sheet-search" className="sr-only">
            Search parts
          </label>
          <div className="relative min-w-0 flex-1">
            <IconSearch size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={inputRef}
              id="sheet-search"
              name="q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => moveFocus(event, listRef, inputRef)}
              placeholder="Part number, e.g. TDA7294"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              className="h-12 w-full rounded-card border border-line-strong bg-paper pl-10 pr-10 text-[16px] text-ink placeholder:text-muted outline-none focus:border-ink focus:bg-card"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-0.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-card text-muted hover:text-ink"
              >
                <IconClose size={18} />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 shrink-0 items-center rounded-card px-3 text-[15px] font-semibold text-ink hover:bg-ink/5"
          >
            Close
          </button>
        </form>
      }
    >
      <div onKeyDown={(event) => moveFocus(event, listRef, inputRef)}>
        <SearchResults
          query={query}
          state={state}
          listRef={listRef}
          onNavigate={onClose}
          onPick={(term) => {
            setQuery(term);
            inputRef.current?.focus();
          }}
        />
      </div>
    </Sheet>
  );
}

function MenuRow({
  href,
  onNavigate,
  icon,
  children,
  meta,
  external = false,
  onClick,
}: {
  href: string;
  onNavigate: () => void;
  icon?: ReactNode;
  children: ReactNode;
  meta?: ReactNode;
  external?: boolean;
  onClick?: () => void;
}) {
  const className =
    "flex min-h-12 items-center gap-3 border-b border-line px-4 text-[16px] font-medium text-ink outline-none hover:bg-paper focus-visible:bg-paper lg:px-6";
  const content = (
    <>
      {icon ? <span className="grid h-6 w-6 shrink-0 place-items-center text-ink-2">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {meta}
      <IconChevronRight size={16} className="shrink-0 text-muted" />
    </>
  );
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={() => {
          onClick?.();
          onNavigate();
        }}
      >
        {content}
      </a>
    );
  }
  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      onClick={() => {
        onClick?.();
        onNavigate();
      }}
    >
      {content}
    </Link>
  );
}

function MenuSheet({
  open,
  onClose,
  departments,
  countsLive,
  returnFocusRef,
  onSearch,
}: {
  open: boolean;
  onClose: () => void;
  departments: NavDepartment[];
  countsLive: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  onSearch: () => void;
}) {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated";
  const isAdmin = session?.user?.role === "admin";
  const sectionTitle = "type-kicker px-4 pb-2 pt-6 text-muted lg:px-6";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Menu"
      mobile="left"
      desktop="left"
      size="md"
      returnFocusRef={returnFocusRef}
      header={
        <div className="flex shrink-0 items-center gap-3 border-b border-line py-2 pl-4 pr-2 lg:pl-6">
          <LogoMark decorative className="h-5 text-ink" />
          <p className="flex-1 text-[17px] font-bold [font-stretch:112%]">Menu</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-11 w-11 place-items-center rounded-card text-ink hover:bg-ink/5"
          >
            <IconClose size={22} />
          </button>
        </div>
      }
    >
      <div className="px-4 pt-3 lg:px-6">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-12 w-full items-center gap-2.5 rounded-card border border-line-strong bg-paper px-3 text-left text-[15px] text-muted hover:border-ink"
        >
          <IconSearch size={20} className="text-ink-2" />
          Search parts, e.g. 2SC5200
        </button>
      </div>

      <nav aria-label="Shop by department">
        {departments.map((group) => (
          <section key={group.id} aria-label={group.label}>
            <h2 className={sectionTitle}>{group.label}</h2>
            <ul className="border-t border-line">
              {group.categories.length > 1 ? (
                <li>
                  <MenuRow
                    href={group.href}
                    onNavigate={onClose}
                    meta={countsLive ? <span className="font-mono text-[12px] text-muted">{group.count}</span> : null}
                  >
                    <span className="font-semibold">All {group.label.toLowerCase()}</span>
                  </MenuRow>
                </li>
              ) : null}
              {group.categories.map((category) => (
                <li key={category.href}>
                  <MenuRow
                    href={category.href}
                    onNavigate={onClose}
                    meta={countsLive ? <span className="font-mono text-[12px] text-muted">{category.count}</span> : null}
                  >
                    {category.label}
                  </MenuRow>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <section aria-label="Help">
        <h2 className={sectionTitle}>Help</h2>
        <ul className="border-t border-line">
          <li>
            <MenuRow href={WHY_GENUINE_HREF} onNavigate={onClose} icon={<IconShield size={20} />}>
              Why genuine?
            </MenuRow>
          </li>
          <li>
            <MenuRow href="/track-your-order" onNavigate={onClose} icon={<IconPackage size={20} />}>
              Track your order
            </MenuRow>
          </li>
          {HELP_LINKS.filter((link) => link.href !== "/track-your-order").map((link) => (
            <li key={link.href}>
              <MenuRow href={link.href} onNavigate={onClose}>
                {link.label}
              </MenuRow>
            </li>
          ))}
          <li>
            <MenuRow
              href={WHATSAPP_HELP_URL}
              external
              onNavigate={onClose}
              onClick={() => trackPixelEvent("Contact", { content_name: "WhatsApp chat", content_category: "menu" })}
              icon={<IconWhatsApp size={20} className="text-whatsapp" />}
              meta={<span className="text-[13px] text-muted">{WHATSAPP_DISPLAY}</span>}
            >
              WhatsApp
            </MenuRow>
          </li>
        </ul>
      </section>

      <section aria-label="Account">
        <h2 className={sectionTitle}>Account</h2>
        <ul className="border-t border-line">
          {signedIn ? (
            <>
              <li>
                <MenuRow href="/my-account" onNavigate={onClose} icon={<IconUser size={20} />}>
                  My account
                </MenuRow>
              </li>
              <li>
                <MenuRow href="/orders" onNavigate={onClose} icon={<IconPackage size={20} />}>
                  My orders
                </MenuRow>
              </li>
              {isAdmin ? (
                <li>
                  <MenuRow href="/admin" onNavigate={onClose}>
                    Admin
                  </MenuRow>
                </li>
              ) : null}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    signOut();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 border-b border-line px-4 text-left text-[16px] font-medium text-ink hover:bg-paper lg:px-6"
                >
                  <span className="grid h-6 w-6 place-items-center text-ink-2">
                    <IconLogout size={20} />
                  </span>
                  Log out
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <MenuRow href="/login" onNavigate={onClose} icon={<IconUser size={20} />}>
                  Log in
                </MenuRow>
              </li>
              <li>
                <MenuRow href="/register" onNavigate={onClose}>
                  Create an account
                </MenuRow>
              </li>
            </>
          )}
        </ul>
      </section>

      <p className="px-4 pb-8 pt-5 text-[13px] leading-5 text-muted lg:px-6">
        Support on WhatsApp (messages only), {SUPPORT_HOURS}.
      </p>
    </Sheet>
  );
}
