// Inline SVG icon set: 24px grid, 1.75px stroke, round caps and joins.
// Decorative by default (aria-hidden); pass `title` to give an icon a name.
import type { ReactNode, SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  /** Rendered size in px (default 24; use 20 in dense UI). */
  size?: number;
  /** Accessible name. Omit for decorative icons next to visible text. */
  title?: string;
};

function Svg({ size = 24, title, strokeWidth = 1.75, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6.5h16M4 12h16M4 17.5h16" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.75" cy="10.75" r="6.25" />
    <path d="m15.4 15.4 4.6 4.6" />
  </Svg>
);

export const IconBag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.4 8.5h13.2l-.95 10.9a1.6 1.6 0 0 1-1.6 1.45H7.95a1.6 1.6 0 0 1-1.6-1.45z" />
    <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
  </Svg>
);

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.25" r="3.75" />
    <path d="M4.75 20.25a7.25 7.25 0 0 1 14.5 0" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </Svg>
);

export const IconArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const IconCheckCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.25 12.25 2.5 2.5 5-5" />
  </Svg>
);

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.25" />
    <path d="M12 16.4v.1" strokeWidth={2.4} />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.25" />
    <path d="M12 7.6v.1" strokeWidth={2.4} />
  </Svg>
);

export const IconTruck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.75 6.5h11v9.75h-11z" />
    <path d="M13.75 9.75h3.6l3.9 3.75v2.75h-7.5" />
    <circle cx="7" cy="17.75" r="1.75" />
    <circle cx="17" cy="17.75" r="1.75" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 19 5.75v5.5c0 4.4-2.9 7.65-7 9.75-4.1-2.1-7-5.35-7-9.75v-5.5z" />
    <path d="m8.9 11.9 2.2 2.2 4-4.1" />
  </Svg>
);

export const IconReceipt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.25h12v17.5l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </Svg>
);

export const IconCash = (p: IconProps) => (
  <Svg {...p}>
    <rect x="2.75" y="6.25" width="18.5" height="11.5" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6.25 9.5v.01M17.75 14.5v.01" strokeWidth={2.4} />
  </Svg>
);

export const IconBolt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.25 2.75 5.5 13.25h5.75l-1 8 7.75-10.5h-5.75z" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.25V12l3.25 2" />
  </Svg>
);

export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5.25" width="18" height="13.5" rx="2" />
    <path d="m3.75 7 8.25 6 8.25-6" />
  </Svg>
);

export const IconPackage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.75 20.25 7v10L12 21.25 3.75 17V7z" />
    <path d="M3.75 7 12 11.25 20.25 7M12 11.25v10" />
    <path d="m7.9 4.85 8.25 4.3" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6.75h16M9.25 6.75V4.5h5.5v2.25" />
    <path d="M6.25 6.75 7 19.4a1.6 1.6 0 0 0 1.6 1.5h6.8a1.6 1.6 0 0 0 1.6-1.5l.75-12.65" />
    <path d="M10 10.75v6M14 10.75v6" />
  </Svg>
);

export const IconSliders = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Svg>
);

export const IconSort = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4.75v14.5M4.75 16 8 19.25 11.25 16M16 19.25V4.75M12.75 8 16 4.75 19.25 8" />
  </Svg>
);

export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-8.5 8.5" />
    <path d="M18 13.5v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h5" />
  </Svg>
);

export const IconMapPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-6.75-5.7-6.75-11.25a6.75 6.75 0 0 1 13.5 0C18.75 15.3 12 21 12 21z" />
    <circle cx="12" cy="9.75" r="2.5" />
  </Svg>
);

export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.75 4.5v4.25H15.5" />
  </Svg>
);

export const IconReturn = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 14.25 4.5 9.75 9 5.25" />
    <path d="M4.5 9.75h10.25a5 5 0 0 1 0 10H11" />
  </Svg>
);

export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 4.25h3.25a2 2 0 0 1 2 2v11.5a2 2 0 0 1-2 2H14.5" />
    <path d="M10 8 6 12l4 4M6 12h10" />
  </Svg>
);

export const IconChip = (p: IconProps) => (
  <Svg {...p}>
    <rect x="6.75" y="6.75" width="10.5" height="10.5" rx="1.5" />
    <path d="M9.5 3.5v3.25M14.5 3.5v3.25M9.5 17.25v3.25M14.5 17.25v3.25M3.5 9.5h3.25M3.5 14.5h3.25M17.25 9.5h3.25M17.25 14.5h3.25" />
  </Svg>
);

export const IconSpeaker = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="2.75" width="14" height="18.5" rx="2" />
    <circle cx="12" cy="14.25" r="3.75" />
    <path d="M12 7.25v.01" strokeWidth={2.4} />
  </Svg>
);

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.25" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.25" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.25" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.25" />
  </Svg>
);

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19z" />
    <path d="M9.75 20.5v-6h4.5v6" />
  </Svg>
);

/** WhatsApp brand glyph (filled). Keep it in WhatsApp green #25D366 or currentColor. */
export const IconWhatsApp = ({ size = 24, title, ...rest }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    aria-hidden={title ? undefined : true}
    role={title ? "img" : undefined}
    focusable="false"
    {...rest}
  >
    {title ? <title>{title}</title> : null}
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);
