// A small message at the bottom of the screen ("Added to cart · View cart"),
// used by the shop pages instead of the browser's alert() popup. Plain DOM, so
// any client component can call it without a provider. Black with white text,
// like the store's other buttons; announced to screen readers.
let hideTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(message: string, link?: { href: string; label: string }) {
  if (typeof document === "undefined") return;

  let toast = document.getElementById("ca-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "ca-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    // Above the floating WhatsApp button on phones (bottom-right).
    toast.className =
      "fixed inset-x-0 bottom-24 z-[60] mx-auto w-fit max-w-[90vw] items-center gap-3 rounded-lg bg-black px-4 py-3 text-sm text-white shadow-lg sm:bottom-6";
    document.body.appendChild(toast);
  }

  const text = document.createElement("span");
  text.textContent = message;
  const parts: Node[] = [text];
  if (link) {
    const anchor = document.createElement("a");
    anchor.href = link.href;
    anchor.textContent = link.label;
    anchor.className = "font-semibold underline underline-offset-2";
    parts.push(anchor);
  }
  toast.replaceChildren(...parts);
  toast.style.display = "flex";

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (toast) toast.style.display = "none";
  }, 4000);
}

/** After Add to Cart: the result message plus a "View cart" link. */
export function showCartToast(message: string) {
  showToast(message, { href: "/cart", label: "View cart" });
}
