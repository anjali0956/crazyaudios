# CrazyAudios Chat Handoff README

This file is a clean handoff summary for continuing work on the `crazyaudios` project in a new chat.

It captures:
- the current project structure
- major features already implemented
- important business rules and UI decisions
- admin panel capabilities
- payment, invoice, shipping, tracking, and preview-gate behavior
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
- Public storefront with category browsing and featured products
- Admin panel for product, banner, traffic, and order management
- Payment, invoice download, shipping quote calculation, and printable shipping labels

---

## 2. High-Level Architecture

### Key folders/files
- `app/page.tsx`
  - Homepage
  - Hero slideshow banners
  - Featured products
  - Category cards
  - Promo banner pair
  - Seller opportunity banner
  - Footer

- `app/product/[id]/page.tsx`
  - Individual product page
  - Multi-image gallery with arrows + thumbnails
  - Related products section

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
  - Preview/password gate
  - admin protection integration path

- `lib/preview-access.ts`
  - shared preview password cookie/token logic

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
The whole site can be temporarily locked behind a single shared password.

Behavior:
- If preview gate is enabled, visitors are redirected to `/preview`
- Shared password unlock sets cookie
- Site becomes accessible after successful unlock
- This includes public site pages

Relevant files:
- `middleware.ts`
- `lib/preview-access.ts`
- `app/preview/page.tsx`
- `app/preview/PreviewAccessClient.tsx`
- `app/api/preview-access/route.ts`

Environment variables involved:
- `PREVIEW_SITE_ENABLED`
- `PREVIEW_SITE_PASSWORD`
- `NEXTAUTH_SECRET`

---

## 4. Homepage / Storefront Features Already Implemented

### Featured Products
- Homepage shows only products marked as `featured`
- Admin can toggle `featured` directly from product list

### Categories section
- Clickable category cards with image + title
- Clicking a category opens category page with products for that category
- Category cards use one product image from the category as representative image

### Product cards
- GST-inclusive price shown on cards
- Flash sale support
- Stock status:
  - `In stock`
  - `Quick! Few left`
  - `Out of stock`

### Product detail page
- Multi-image gallery for each product
- Left/right arrows
- Thumbnail strip
- Related products section

### CA Certified emblem
- Applied to most products where relevant
- Explicitly removed for connectors and rotary encoder products
- Not shown on category cards

### Seller opportunity banner
- Horizontal banner below the service icons section
- CTA via email

### Footer links/pages
Pages and links were added for:
- privacy policy
- terms of service
- shipping & refund
- track order
- FAQ
- about us
- contact us
- my account/cart/checkout links

---

## 5. Banner System

### Top hero slideshow
There are multiple top scrolling/sliding banners.

Important visual requirement:
- banners must fit well on both desktop and mobile
- do not stretch or crop carelessly
- `object-contain`-style behavior was preferred for several banners
- user was especially sensitive to banner ratio issues

Current hero banners include:
- Peerless Store
- CA Certified banner
- BrainsAudios banner
- CrazyAudios Flea Market banner

### Homepage promo banners near footer
Stored as left/right homepage banner pair in site settings.

Admin can update:
- left homepage banner URL
- right homepage banner URL

Relevant files:
- `app/page.tsx`
- `app/api/settings/route.ts`
- `models/SiteSettings.ts`
- `app/admin/AdminClient.tsx`

---

## 6. Pricing / GST Rules

This is very important and was corrected explicitly:

### Current pricing rule
- Product prices entered by admin are already **GST-inclusive**
- Do **not** add GST on top of stored product price
- Display the product price as entered
- Use GST only for **breakdown extraction**

### GST display
- Product cards show: `Inclusive of GST`
- Checkout summary and invoices show GST breakdown
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
Important decision:
- Do not auto-invent arbitrary weights silently in code anymore
- Admin has product weight field in grams
- Shipping depends on stored `weightGrams`

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
- create order route
- verify payment route

Frontend:
- checkout loads Razorpay checkout script
- opens modal
- verifies on success

Relevant files:
- `app/api/create-order/route.ts`
- `app/api/verify-payment/route.ts`
- `app/checkout/page.tsx`

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
- do not silently invent new weights unless explicitly asked

---

## 15. Preview / Deployment / Environment Notes

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
- `PREVIEW_SITE_ENABLED`
- `PREVIEW_SITE_PASSWORD`

### Deployment notes
- There were past prerender/build issues with preview pages
- Those were addressed by separating preview server/client concerns

If deployment fails:
- inspect build logs for App Router prerender errors
- especially preview-related routes and dynamic client usage

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

