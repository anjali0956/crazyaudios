"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "@/app/components/icons";
import { ProductImage } from "@/app/components/ui/ProductImage";
import { cx } from "@/app/components/ui/cx";
import { FRAME, PHOTO } from "./gallery-shared";

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const ARROW =
  "absolute top-1/2 z-[2] hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-card/95 text-ink " +
  "opacity-0 transition-opacity duration-150 ease-out hover:border-line-strong group-hover:opacity-100 focus-visible:opacity-100 " +
  "disabled:!opacity-0 lg:grid";

/**
 * Swipeable photo strip (native scroll-snap: swiping needs no JavaScript),
 * with a "2 / 3" counter, thumbnails and, on desktop, subtle arrows. Never
 * moves on its own.
 */
export function GalleryCarousel({
  images,
  alt,
  sizes,
  badge,
}: {
  images: string[];
  alt: string;
  sizes: string;
  /** Overlay rendered inside the frame (sale badge). */
  badge?: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // Photos after the first load lazily; once the page is idle they are
  // fetched so a swipe never lands on a blank slide.
  const [warm, setWarm] = useState(false);
  const count = images.length;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const width = track.clientWidth || 1;
        setIndex(Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / width))));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [count]);

  useEffect(() => {
    const idle = window as IdleWindow;
    if (idle.requestIdleCallback) {
      const handle = idle.requestIdleCallback(() => setWarm(true), { timeout: 3000 });
      return () => idle.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(() => setWarm(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const go = (target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.min(count - 1, Math.max(0, target));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: next * track.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: count - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    go(keys[event.key]);
  };

  return (
    <div>
      <div className={cx(FRAME, "group")}>
        <div
          ref={trackRef}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label={`Photos of ${alt}`}
          onKeyDown={onKeyDown}
          className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-ink"
        >
          {images.map((src, i) => (
            <div
              key={src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              className="relative h-full w-full shrink-0 snap-center snap-always"
            >
              <ProductImage
                src={src}
                alt={i === 0 ? alt : `${alt}, photo ${i + 1}`}
                fill
                sizes={sizes}
                priority={i === 0}
                fetchPriority={i === 0 ? "high" : undefined}
                loading={i === 0 ? undefined : warm ? "eager" : "lazy"}
                draggable={false}
                className={PHOTO}
              />
            </div>
          ))}
        </div>

        {badge}

        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 right-3 z-[2] rounded-full border border-line bg-paper px-2 py-0.5 font-mono text-[11px] font-medium leading-4 text-ink-2 tabular"
        >
          {index + 1} / {count}
        </span>

        <button type="button" aria-label="Previous photo" disabled={index === 0} onClick={() => go(index - 1)} className={cx(ARROW, "left-3")}>
          <IconChevronLeft size={20} />
        </button>
        <button type="button" aria-label="Next photo" disabled={index >= count - 1} onClick={() => go(index + 1)} className={cx(ARROW, "right-3")}>
          <IconChevronRight size={20} />
        </button>
      </div>

      <ul role="list" aria-label="Product photos" className="no-scrollbar mt-2 flex gap-2 overflow-x-auto lg:mt-3">
        {images.map((src, i) => {
          const current = i === index;
          return (
            <li key={src} className="shrink-0">
              <button
                type="button"
                aria-label={`Show photo ${i + 1} of ${count}`}
                aria-current={current ? "true" : undefined}
                onClick={() => go(i)}
                className={cx(
                  "relative block h-12 w-12 overflow-hidden rounded-chip border bg-card transition-[border-color,box-shadow] duration-150 lg:h-16 lg:w-16",
                  current ? "border-ink ring-1 ring-inset ring-ink" : "border-line hover:border-line-strong"
                )}
              >
                <ProductImage src={src} alt="" fill sizes="64px" className="object-contain p-1" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
