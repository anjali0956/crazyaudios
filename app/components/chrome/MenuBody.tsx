"use client";

// The menu sheet's content. Loaded on demand by HeaderClient (intent, first
// open, or idle after load), so departments, help rows and the account section
// are not part of every page's JavaScript. The session is fetched only when the
// menu opens: no next-auth SessionProvider (and no /api/auth/session request)
// on page loads.
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { trackPixelEvent } from "@/lib/meta-pixel";
import { IconChevronRight, IconLogout, IconPackage, IconSearch, IconShield, IconUser, IconWhatsApp } from "@/app/components/icons";
import { HELP_LINKS, SUPPORT_HOURS, WHATSAPP_DISPLAY, WHATSAPP_HELP_URL, WHY_GENUINE_HREF } from "./links";
import type { NavDepartment } from "./nav-types";

type MenuSession = { signedIn: boolean; isAdmin: boolean };

const SIGNED_OUT: MenuSession = { signedIn: false, isAdmin: false };
let lastSession: MenuSession | null = null;

/** GET /api/auth/session (next-auth answers {} when signed out). */
async function fetchMenuSession(): Promise<MenuSession> {
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
    const data = (response.ok ? await response.json() : null) as { user?: { role?: string } } | null;
    lastSession = { signedIn: Boolean(data?.user), isAdmin: data?.user?.role === "admin" };
    return lastSession;
  } catch {
    return lastSession ?? SIGNED_OUT;
  }
}

/**
 * Signed-in state for the account rows, refreshed every time the menu opens
 * (log in / out happen without a full reload). Null until the first answer.
 */
function useMenuSession(): MenuSession | null {
  const [session, setSession] = useState<MenuSession | null>(() => lastSession);
  useEffect(() => {
    let active = true;
    fetchMenuSession().then((next) => {
      if (active) setSession(next);
    });
    return () => {
      active = false;
    };
  }, []);
  return session;
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

export default function MenuBody({
  departments,
  countsLive,
  onClose,
  onSearch,
}: {
  departments: NavDepartment[];
  countsLive: boolean;
  onClose: () => void;
  onSearch: () => void;
}) {
  const session = useMenuSession();
  const signedIn = Boolean(session?.signedIn);
  const isAdmin = Boolean(session?.isAdmin);
  const sectionTitle = "type-kicker px-4 pb-2 pt-6 text-muted lg:px-6";

  return (
    <>
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
        <ul className="border-t border-line" aria-busy={session ? undefined : true}>
          {!session ? (
            // First open, session not known yet: hold the space of two rows rather than guess.
            <>
              <li aria-hidden="true" className="min-h-12 border-b border-line" />
              <li aria-hidden="true" className="min-h-12 border-b border-line" />
            </>
          ) : signedIn ? (
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
                    // next-auth's client is only needed here; signOut works without a SessionProvider.
                    import("next-auth/react")
                      .then(({ signOut }) => signOut())
                      .catch(() => window.location.assign("/my-account"));
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
    </>
  );
}
