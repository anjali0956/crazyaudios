# CrazyAudios Chat Handoff README

This file is a clean handoff summary for continuing work on the `crazyaudios` project in a new chat.

It captures:
- the current project structure
- major features already implemented
- important business rules and UI decisions
- admin panel capabilities
- payment, invoice, shipping and tracking behavior
- current known constraints and expectations

Important:
- Do **not** paste secret values into a new chat.
- Share only **environment variable names**, not the actual keys/secrets.
- Several product/content changes were made directly through admin/data updates over time, so always verify both **code** and **database/admin content** when checking behavior.

---

## 1. Project Overview

### Stack
- Next.js App Router
- TypeScript
- MongoDB with Mongoose
- NextAuth for auth/session
- Razorpay Standard Web Checkout
- PDF invoice generation using `pdf-lib`

### Main goals of the site
- E-commerce store for audio/electronics parts
- Public storefront built for Instagram/Facebook ad traffic on phones: components first, around the owner's message "original parts, directly imported" (see section 4)
- Admin panel for product, banner, traffic, and order management
- Payment, invoice download, shipping quote calculation, and printable shipping labels

---

## 2. High-Level Architecture

### Key folders/files
- `app/page.tsx`
  - Homepage, server-rendered (ISR, `revalidate = 60`)
  - Hero "Original parts, directly imported.", service promises, department
    tiles, most-searched originals, "Why original matters", Peerless band,
    BrainsAudios modules, the admin's promo banner pair
  - Data from `app/components/home/home-data.ts`; it falls back to a static
    page if the database is down

- `app/product/[id]/page.tsx`
  - Product page = the ad landing page. Server-rendered with ISR
    (`revalidate = 60`); every product is pre-rendered at build time when the
    database is reachable (so the build reads MongoDB)
  - Real 404 for unknown ids; JSON-LD (Product, BreadcrumbList) and og tags for
    link previews
  - UI: `ProductDetailsClient.tsx` + `app/components/product/*` (gallery,
    sticky buy bar, delivery check, trust strip, spec table, complementary part)

- `app/category/[category]/page.tsx`
  - Category and department pages on clean slugs (`/category/amplifier-ics`,
    `/category/speaker-drivers`); old URLs such as `/category/amplifier%20ic`
    308-redirect to them
  - Sort, "In stock only" and brand filters (`app/components/catalog/*`)

- `app/search/page.tsx`, `app/api/search/route.ts`, `lib/search.ts`
  - Part-number search: ignores case, spaces and punctuation, treats O and 0
    alike, and ignores "original"/"genuine"

- `app/why-genuine/page.tsx`
  - Counterfeit explainer (never names another seller)

- `app/checkout/*`
  - `CheckoutView.tsx` (form + summary), `checkout-form.ts` (fields and the
    same validation rules as the server), `useShippingQuotes.ts`,
    `razorpay-client.ts` (Razorpay modal, or redirect mode with `callback_url`
    inside the Instagram/Facebook in-app browsers)

- `app/components/` (storefront UI)
  - `chrome/` header, menu, search, footer; `home/`; `catalog/`; `product/`;
    `cart/` (`cart-store.ts`: localStorage key `cart`, same item shape as the
    old site, so old carts keep working); `checkout/`; `content/` (info pages);
    `ui/` (Button, ProductCard, Price, Sheet, Toast, ClaimLine, ...)

- `lib/catalog.ts`
  - every storefront product read, cached 60 s (`unstable_cache`, tag
    `products`); departments and counts

- `lib/categories.ts`
  - category slugs and departments, and `trustLine()`: the ONLY place sourcing
    claims come from (see section 4)

- `lib/display.ts`
  - customer-facing names (`displayName`: "LM 3886" -> "LM3886", "TLO72" ->
    "TL072"), collapsing duplicate listings, `KNOWN_WRONG_IMAGES`

- `lib/parts.ts`
  - part descriptors, most-faked parts, complementary pairs (2SC5200 <-> 2SA1943)

- `lib/format.ts`
  - `formatINR`, `pricingOf`, `brandOf`, `specsOf`

- `app/globals.css`
  - design tokens (Tailwind v4 `@theme`): ink `#121416`, paper `#F7F5F0`,
    signal orange `#FF5A1F` (ink text on orange); fonts Archivo + IBM Plex Mono
    via `next/font`

- `/styleguide`
  - component gallery; hidden in production unless `ENABLE_STYLEGUIDE=1`

- `app/admin/AdminClient.tsx`
  - Main admin panel UI
  - Product management
  - Order management and tracking
  - Traffic analytics view
  - Shipping label printing logic
  - Homepage promo banner management

- `app/api/products/route.ts`
  - CRUD for products

- `app/api/products/[id]/route.ts`
  - Single product fetch

- `app/api/create-order/route.ts`
  - Creates internal order + Razorpay order
  - Pulls live shipping quote
  - Builds totals

- `app/api/verify-payment/route.ts`
  - Verifies Razorpay signature
  - Marks order paid
  - Decrements stock

- `app/api/orders/[id]/invoice/route.ts`
  - Generates invoice PDF

- `app/api/admin/orders/route.ts`
  - Admin order fetch/update

- `app/api/traffic/route.ts`
  - Site traffic logging + analytics summary

- `app/api/settings/route.ts`
  - Homepage banner settings persistence

- `app/api/shipping-rate/route.ts`
  - Live shipping rate API integration

- `lib/order-utils.ts`
  - GST logic
  - display pricing
  - totals calculation

- `lib/shipping-rates.ts`
  - Shipping API call + courier selection
  - shipping uplift logic
  - estimated shipment weight logic

- `middleware.ts`
  - admin protection (non-admins are sent to /login?callbackUrl=/admin)

- `lib/payments.ts`
  - `markOrderPaid()`: the one routine that turns a prepaid order "paid"
    (used by verify-payment, the Razorpay webhook and admin reconcile)

- `lib/order-access.ts`
  - who may see an order (account ownership, signed guest links)

- `models/Product.ts`
  - product schema

- `models/Order.ts`
  - order schema

- `models/SiteSettings.ts`
  - site settings storage (homepage banners)

---

## 3. Authentication / Access / Security

### Admin access protection
This was explicitly requested as a major security fix.

Implemented protection includes:
- role-based admin access check
- middleware-based handling

### Preview/private site gate
Removed (it was no longer wired into middleware). `PREVIEW_SITE_ENABLED` and
`PREVIEW_SITE_PASSWORD` are unused and can be deleted from the hosting env.

### Order privacy
- A signed-in customer sees only orders placed while signed in to that account
  (`userId` from the session, stored at checkout). The checkout email alone never
  grants access, because anyone can register any email address.
- Orders saved before `userId` existed count for an account only if they were placed
  after the account was created.
- Guests open one order through a signed link: `orderAccessToken()` =
  HMAC-SHA256(orderId + receipt, NEXTAUTH_SECRET), base64url. The success page and
  Track order link the invoice as `/api/orders/<id>/invoice?token=...`.
- Emails are stored lowercase; lookups are case-insensitive (older rows keep capitals).
- Login shows one message for unknown email and wrong password.

---

## 4. Storefront (redesign, live since 5 Oct 2026, PR #8)

Built for people who tap an Instagram/Facebook ad on a phone. The owner's
message is "original parts, directly imported": components lead, and Peerless
speakers are a secondary band.

### What a customer sees
- A slim sticky header (menu, logo, search, cart count) and the same footer
  on every page
- Homepage: hero, four service promises, shop-by-department tiles, the
  most-searched originals, "Why original matters", the Peerless band,
  BrainsAudios modules, and the admin's promo banner pair
- Category and department pages: 2-column grid, sort, "In stock only" and
  brand filters, Add to cart on every card
- Product page: photo, maker, name, descriptor, price incl. GST and stock on
  the first screen; sticky Add to cart / WhatsApp bar; delivery date by PIN
  code; trust strip; datasheet-style specs; the complementary part
- The cart re-checks prices and stock with the server (`/api/cart/validate`)
- Checkout: phone first, the PIN code fills city and state
  (`/api/pincode/[pin]`), a state dropdown, billing = delivery by default,
  shipping and the COD fee shown separately, a sticky Pay / Place COD order bar
- `featured` (Admin) still matters: featured products sort first in the home
  sections and listings

### Rules that are easy to break
- Prices: `formatINR` shows whole rupees, or the exact paise when an amount has
  them (a flash-sale ₹1,112.50 is never shown as ₹1,113), so the page always
  equals what Razorpay charges
- Sourcing claims come only from `trustLine()` in `lib/categories.ts`:
  semiconductors and passives say "Original · Directly imported · Invoice with
  GST"; Peerless says "Genuine Peerless by Tymphany · Invoice with GST";
  everything else "Original · Invoice with GST". Say "GST invoice" or "Tax
  invoice" only once `INVOICE_SELLER_GSTIN` is set
- Never name or accuse other sellers (the why-genuine page and the ads)
- Display names (`lib/display.ts`) are for customers only. The database, the
  Pixel, CAPI and the Meta feed keep the raw admin names, and product URLs stay
  `/product/{_id}` (the feed and the Pixel rely on that id)
- Photos listed in `KNOWN_WRONG_IMAGES` render "Photo coming soon". A new
  upload in Admin gets a new path, so the right photo shows automatically
- Admin edits reach the storefront within about 2 minutes (60 s data cache +
  60 s ISR). Nothing invalidates the cache on save yet

### Images
- Next's built-in optimiser (`/_next/image`) serves AVIF/WebP at the right
  width; the old custom loader is gone
- The files in `/public` were normalised in PR #8 (square, centred, real
  JPEG/PNG matching the extension, at least 500×500 for Meta) under the same
  names, so feed image links did not change

### CA Certified
- A small "CA Certified" tag next to the maker on product pages (no longer the
  big emblem over the photo); `lib/shouldShowCaEmblem.ts` still decides which
  products get it (not connectors or rotary encoders)

### Info pages
- Privacy policy, terms of service, shipping & refund, track order, FAQ, about
  us, contact us and why-genuine share `app/components/InfoPageShell.tsx`.
  The privacy policy discloses the Meta Pixel and Conversions API

---

## 5. Banner System

### Top hero slideshow
Removed in PR #8. The homepage now opens with a fixed hero (headline, two
buttons, service promises) that reads well inside Instagram's browser. The old
slides (Peerless Store, CA Certified, BrainsAudios, Flea Market) were image
text that was unreadable on phones.

### Homepage promo banners
Stored as the left/right banner pair in site settings (Admin → "Homepage
Banner Pair"). They show as two image cards on the homepage, each keeping its
own aspect ratio, and only when real images are set: the stock SVG artwork
counts as "not set". The left card links to `/category/diodes` and the right
one to `/why-genuine` (the admin form has no link field).

Relevant files:
- `app/components/home/promo-banners.ts`, `app/components/home/PromoBanners.tsx`
- `app/api/settings/route.ts`
- `models/SiteSettings.ts`
- `app/admin/AdminClient.tsx`

Banner images must still fit both desktop and mobile without stretching or
careless cropping.

---

## 6. Pricing / GST Rules

This is very important and was corrected explicitly:

### Current pricing rule
- Product prices entered by admin are already **GST-inclusive**
- Do **not** add GST on top of stored product price
- Display the product price as entered
- Use GST only for **breakdown extraction**

### GST display
- Product pages say "Incl. GST" under the price; cards show the GST-inclusive price
- Checkout states the GST once ("Includes ₹X GST"); invoices show the breakdown
- GST bifurcation includes:
  - CGST + SGST for intra-state
  - IGST for inter-state

### Courier GST rule
- Courier charges also include GST
- Checkout/invoice shows a combined GST amount covering:
  - product GST portion
  - courier GST portion

Important current expectation:
- Do **not** separately show “before GST” and “after GST” for product and courier to the customer
- Just show totals and GST breakdown cleanly

Relevant file:
- `lib/order-utils.ts`

---

## 7. Flash Sale / Discount Logic

The user requested a non-standard flash sale behavior:

### Current intended behavior
If admin sets:
- product price = already final amount to be displayed
- discount percentage = for marketing display only

Then:
- displayed main price should stay at the entered final price
- original/struck-out price can appear higher based on discount logic

This area is business-rule sensitive. If touching flash sale math again, confirm current storefront behavior before changing.

---

## 8. Shipping Integration

### Shipping API
Integrated against Kallada shipping rate API.

Relevant file:
- `lib/shipping-rates.ts`

### Current shipping logic
- Pickup origin pincode comes from env
- Delivery pincode comes from checkout form
- Product weights determine shipment weight
- API returns courier options
- Customer can choose shipping service based on estimated delivery

### Weight handling
- Admin has product weight field in grams; shipping uses stored `weightGrams`
- A product without a weight is still sellable: shipping assumes 50 g per unit
  (1000 g for speaker/woofer/tweeter categories, 150 g for modules) and logs a
  server warning naming the product, so the weight can be fixed in Admin

### Live rates, timeout and fallback
- The rate API call times out after 6 s. On error, timeout or missing config the
  fallback table is used (customer prices): <=500 g Rs 99, <=1 kg Rs 149,
  <=2 kg Rs 199, +Rs 60 per extra kg; COD fee max(Rs 40, 2% of products),
  rounded up to Rs 5; ETA "3–6 days"; `estimated: true`. Free shipping still applies.
- The quote returns `shippingFee` (without COD) and `codFee` separately, plus
  `etaDate`, `courierName`, `estimated`, `freeShippingApplied`. Orders store both
  fees and charge exactly products + shippingFee + codFee. Base/uplift numbers
  stay inside `lib/shipping-rates.ts`.

### Courier price uplift rule
This custom rule was requested:
- after courier API gives price
- add 10
- round upward to a multiple of 5

This is implemented in:
- `lib/shipping-rates.ts`
  - `adjustCourierPrice`

### Pickup origin
Used in shipping configuration:
- Irinjalakuda / Kerala region
- Pickup pincode comes from env variable

### Customer shipping service choice
At checkout:
- multiple courier services can be shown
- user can choose based on ETA / service

### Tracking discussion
Important business note:
- Shipping quote API alone is not enough for full live tracking
- real live tracking generally requires courier/tracking integrations or aggregator APIs
- admin order tracking exists in-site as manual fulfillment tracking timeline

Relevant files:
- `app/checkout/page.tsx`
- `app/api/shipping-rate/route.ts`
- `app/api/create-order/route.ts`
- `lib/shipping-rates.ts`

---

## 9. Orders / Checkout / Payment

### Razorpay
Integrated using Standard Web Checkout.

Backend:
- create order route (Razorpay order notes carry `internal_order_id` + `receipt`)
- verify payment route (browser confirmation)
- webhook `app/api/razorpay/webhook/route.ts` (server confirmation; saves orders
  when the browser never comes back, e.g. UPI app switch). Razorpay Dashboard ->
  Settings -> Webhooks: URL `https://www.crazyaudios.com/api/razorpay/webhook`,
  events `payment.captured` + `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`
- all three paths (and admin "Check with Razorpay") call `markOrderPaid()`: an
  atomic created -> paid switch, so stock, invoice number, timeline and the Meta
  Purchase event happen exactly once. If stock ran out after payment the order is
  still paid and flagged `needsAttention` for a refund or back-order
- Admin -> Orders & Tracking -> "Payment pending (unverified)" lists online orders
  not confirmed after 15 minutes; "Check with Razorpay" reconciles the last 7 days

Frontend (`app/checkout/razorpay-client.ts`):
- normal browsers: Razorpay's modal, then `/api/verify-payment`
- Instagram/Facebook in-app browsers (user agent FBAN/FBAV/Instagram): redirect
  mode, because the modal often dies there during the UPI app switch. Razorpay
  posts the result to `callback_url` = `/api/razorpay/callback`, which verifies
  the signature, calls `markOrderPaid()` and answers 303 to
  `/checkout/success?order=...` (or back to `/checkout?payment=failed&reason=...`)

Relevant files:
- `app/api/create-order/route.ts`
- `app/api/verify-payment/route.ts`
- `app/api/razorpay/callback/route.ts`
- `app/checkout/page.tsx`, `app/checkout/CheckoutView.tsx`

### Important payment notes
- Free test-order hack for TIP35 was created temporarily and then rolled back
- Current state should be normal pricing again
- Razorpay minimum amount rule still matters

### Order success
After successful payment:
- cart cleared
- redirected to success page
- invoice download available
- order visible in user orders page

Relevant files:
- `app/checkout/success/page.tsx`
- `app/orders/page.tsx`

---

## 10. Invoice PDF

### Numbering and seller details
- CrazyAudios branding; titled "Tax Invoice" only when `INVOICE_SELLER_GSTIN`
  is set, otherwise "Invoice"
- Sequential numbers `CA/2026-27/000123` per Indian financial year (Apr-Mar),
  from the `counters` collection, assigned only when an order is paid or a COD
  order is confirmed (`PENDING-<receipt>` placeholder before that). Older orders
  keep their `INV-...` numbers
- Seller block: ElectroSupply, Nakkara Complex, Town Hall Road, Irinjalakuda,
  Thrissur, Kerala - 680121 (the shipping-label sender) unless
  `INVOICE_SELLER_NAME` / `INVOICE_SELLER_ADDRESS` (use `|` between lines) are
  set. The GSTIN line comes only from `INVOICE_SELLER_GSTIN`; nothing is invented

### Current status
Invoice PDF layout was fixed because:
- shipping address overlapped items
- long text was colliding

### Improvements already done
- wrapped text
- flow-based layout
- cleaner section spacing
- cleaner items layout
- totals block repositioned

Relevant file:
- `app/api/orders/[id]/invoice/route.ts`

If invoice looks broken again:
- check hard-coded coordinates
- check long address wrapping
- check product name widths

---

## 11. Admin Panel

Admin panel is now split into cleaner top-level views:
- `Catalog & Products`
- `Traffic Analytics`
- `Orders & Tracking`

Relevant file:
- `app/admin/AdminClient.tsx`

### Product management features already present
- Add product
- Edit product
- Delete product
- Feature toggle
- Flash sale toggle
- Discount percentage
- Weight in grams
- Extra image URLs
- Search bar
- Category filter
- Stock filter
- Promotion filter
- Paginated product list

### Product UX fixes in admin
- Search bar next to category workflow added
- Editing a product should scroll to edit form rather than top of page

### Orders & tracking admin features
- Dedicated orders tab
- order list in table format
- selected order detail panel
- shipping address / billing address
- fulfillment status update
- courier name
- tracking number
- estimated delivery
- customer-facing note
- location

### Fulfillment statuses used
- processing
- packed
- shipped
- out_for_delivery
- delivered
- completed
- cancelled

### Traffic analytics
Moved into its own admin view.

Analytics includes:
- total page views
- today’s page views
- total unique visitors
- today’s unique visitors
- top pages
- recent daily activity

Traffic files:
- `app/api/traffic/route.ts`
- `app/admin/AdminClient.tsx`
- `app/providers.tsx`

### Note on unique visitors
Unique visitors are based on stored visitor IDs, not simply every page refresh.

---

## 12. Shipping Label Printing

This was heavily customized.

### Current shipping label behavior
- single-order print prints **one** label only
- multiple-order print supports:
  - `4 per page`
  - `8 per page`

### Logic
- if only one order is printed -> one label only
- if multiple orders selected from ready-to-ship list -> use chosen 4-up or 8-up layout

### Printable order set
Currently includes fulfillment statuses:
- packed
- shipped
- out_for_delivery

This was fixed because buttons originally only counted `packed`.

### Label content format
Header:
- `ELECTROSUPPLY`

FROM block:
- ELECTROSUPPLY
- NAKKARA COMPLEX
- Town Hall Road
- Irinjalakuda, Thrissur, Kerala
- PIN - 680121

TO block:
- customer name
- address
- city/state/pincode
- phone

Footer:
- `ElectroSupply - Shipping label`

### Important user expectation
- Labels should be suitable for A4 sticker printing
- 4-up and 8-up layouts must remain compact and printable

Relevant file:
- `app/admin/AdminClient.tsx`

---

## 13. Mobile Stability / Client-Side Error Fixes

There were mobile/browser issues earlier.

### Fixes already made
- safer localStorage access
- safer category API response handling
- safer product image fallbacks
- reduced client-side crashes when data shape is unexpected

Areas touched:
- `app/providers.tsx`
- `app/components/CategoryDropdown.tsx`
- `app/page.tsx`

If mobile shows `client-side exception` again:
- first inspect API responses
- especially category/product endpoints
- check `res.data` shape before `.map()`
- check image src values are never empty strings

---

## 14. Product / Category Content Rules and Data Notes

Over the course of this work, many content/business rules were added.

### CA Certified meaning
About Us page should clearly explain:
- trust
- authenticity
- sourcing from authorized manufacturers for certified transistors/ICs
- procurement from reputed dealers/importers for remaining categories

Also:
- clicking anywhere on CA Certified banner should go to About Us

### Connectors and rotary encoder
- connectors category created
- rotary encoder category created
- CA emblem removed from connectors and rotary encoder products
- description should mention brand as `Generic`

### Tonecontrol category
- user requested tonecontrol category be deleted

### BrainsAudios category
- category exists
- some products added from user-provided specs

### Capacitors
- capacitor products were added in bulk with:
  - names
  - stock
  - prices
  - descriptions
  - some pack-size rules

### Product weights
At one point, user wanted category-based default weights:
- speaker/subwoofer/woofer/tweeter/full range/pro audio/radiator = 1000g
- most others = 10g

But later requirement emphasized admin-controlled weights.

Current best interpretation:
- shipping should rely on actual `weightGrams` values stored in products/admin
- a missing weight no longer blocks checkout: a per-category fallback is used and
  logged as a warning (see section 8), so fix the weight in Admin when it appears

---

## 15. Deployment / Environment Notes

### Environment variables used
Do **not** paste the values into chat. Only share variable names if needed.

Important env names:
- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `KALLADA_SHIPPING_API_KEY`
- `KALLADA_SHIPPING_RATE_API_URL`
- `KALLADA_PICKUP_PINCODE`
- `RAZORPAY_WEBHOOK_SECRET` (secret) – same value as the webhook secret in the Razorpay Dashboard. Without it the webhook answers 503 and logs why.
- `INVOICE_SELLER_NAME`, `INVOICE_SELLER_ADDRESS` (optional) – override the default seller (ElectroSupply, Irinjalakuda) on invoices.
- `INVOICE_SELLER_GSTIN` (optional) – printed on invoices when set, and turns the title into "Tax Invoice".
- `PINCODE_API_URL` (optional) [`https://api.postalpincode.in/pincode`] – PIN code → city/state lookup used by checkout.
- `ENABLE_STYLEGUIDE` (optional) – set to `1` to show `/styleguide` in production.

Meta ads, COD and free shipping (all optional; defaults in brackets):
- `META_CAPI_ACCESS_TOKEN` (secret) – Conversions API token from Events Manager → Settings. Without it, server-side Purchase events are skipped; the browser pixel still works.
- `META_TEST_EVENT_CODE` – only while testing; makes server events show in Events Manager → Test events. Remove afterwards.
- `META_GRAPH_API_VERSION` [`v26.0`]
- `NEXT_PUBLIC_META_PIXEL_ID` [`3060638780773435`]
- `NEXT_PUBLIC_SITE_URL` [`https://www.crazyaudios.com`] – used for absolute links in previews, structured data and the product feed.
- `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD` [`1499`] – products total (incl. GST) for free standard shipping; `0` turns it off.
- `NEXT_PUBLIC_COD_ENABLED` [on] – set to `false` to turn Cash on Delivery off.
- `NEXT_PUBLIC_COD_MAX_ORDER_VALUE` [`5000`] – largest products total allowed for COD.
- `NEXT_PUBLIC_WHATSAPP_NUMBER` [`917907570000`] – WhatsApp Business number for the chat buttons (digits, with country code).

`NEXT_PUBLIC_*` values are baked in at build time, so changing them needs a redeploy.

Product feed for Meta Commerce Manager: `https://www.crazyaudios.com/api/meta-feed`.

### Deployment notes
If deployment fails:
- inspect build logs for App Router prerender errors
- especially dynamic client usage (e.g. useSearchParams without Suspense)

---

## 16. Current UI / Behavior Expectations That Should Not Be Accidentally Broken

These were important to the user:

- Admin panel should feel organized, not like one endless page
- Orders and analytics should be in separate admin views
- Product list should be searchable/filterable/paginated
- Clicking add-to-cart on homepage should show “Added to cart!” and **not** auto-redirect
- Category titles should say just category name, not “products”
- Product cards and category cards have gone through several color changes; current visual choices should be checked in code before restyling
- CA banner should link to About Us
- Seller banner should stay horizontal and compact
- Shipping labels must support realistic print use

---

## 17. Recent Fixes Immediately Before This Handoff

Most recent work completed:

1. Invoice PDF overlap fixed
- wrapped text and cleaner flow layout

2. Shipping label printing improved
- single label prints only one
- 4-per-page and 8-per-page options added

3. Print label order filter fixed
- printable order list now includes:
  - packed
  - shipped
  - out_for_delivery

4. Temporary free TIP35 test order path was created and then fully rolled back
- current state should be normal pricing and checkout again

---

## 18. Suggested Prompt To Start A New Chat

Use something like this:

> I’m continuing work on the CrazyAudios Next.js ecommerce project. Read the attached `CHAT_HANDOFF_README.md` first and use it as the source of truth. Do not ask me to repeat background already covered there. Before changing anything, summarize the current architecture and the last completed features. Then help me with: [your new task].

---

## 19. Final Reminder

When continuing this project in a new chat:
- read `CHAT_HANDOFF_README.md` first
- avoid repeating old experiments that were already rolled back
- do not expose secrets
- confirm current behavior in both code **and** admin/database content if something looks inconsistent

