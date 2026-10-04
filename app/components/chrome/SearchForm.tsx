import { IconSearch } from "@/app/components/icons";
import { buttonClasses } from "@/app/components/ui/Button";
import { cx } from "@/app/components/ui/cx";

/**
 * Plain GET form to /search?q= — works without JavaScript (404 page, error
 * page, empty states).
 */
export function SearchForm({
  defaultValue,
  placeholder = "Part number, e.g. 2SC5200",
  label = "Search parts",
  className,
  autoFocus = false,
}: {
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <form role="search" action="/search" method="get" className={cx("flex w-full gap-2", className)}>
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <IconSearch size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          className="h-12 w-full rounded-card border border-line-strong bg-card pl-11 pr-3.5 text-[16px] text-ink placeholder:text-muted outline-none hover:border-ink-2/60 focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-ink"
        />
      </label>
      <button type="submit" className={buttonClasses({ variant: "dark", size: "lg", className: "h-12 px-5" })}>
        Search
      </button>
    </form>
  );
}
