import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import type { SearchSuggestion } from "@/lib/search";

// The always-loaded half of header search: the suggestions hook and arrow-key
// focus movement. The result list (search.tsx) loads on demand.

export type SearchStatus = "idle" | "loading" | "ready" | "error";
type Result = { results: SearchSuggestion[]; total: number };
type State = Result & { query: string; status: SearchStatus };
export type SearchState = State;

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
