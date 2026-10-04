import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { CONFIRMED_ORDER_STATUSES, getTaxBreakdown, roundCurrency } from "@/lib/order-utils";
import { isOrderOwnedBy, isValidOrderAccessToken } from "@/lib/order-access";
import { assignInvoiceNumber, isPendingInvoiceNumber } from "@/lib/invoice-number";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The built-in PDF fonts use WinAnsi encoding, so normalize text supplied by
// customers/products before measuring or drawing it. This prevents one smart
// quote, currency symbol, or other Unicode character from aborting an invoice.
function toPdfText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/₹/g, "Rs ")
    .replace(/[‘’′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7e]/g, "?");
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const words = toPdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const candidateWidth = font.widthOfTextAtSize(candidate, size);

    if (candidateWidth <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    lines.push(word);
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Customers open invoice links in a browser: answer problems with a readable page, not JSON.
function messagePage(
  status: number,
  title: string,
  message: string,
  links: Array<{ href: string; label: string }>
) {
  const buttons = links
    .map(
      (link, index) =>
        `<a href="${escapeHtml(link.href)}"${index ? ' class="secondary"' : ""}>${escapeHtml(link.label)}</a>`
    )
    .join("");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${escapeHtml(title)} | ${SITE_NAME}</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#F7F5F0;color:#121416}
main{max-width:480px;margin:12vh auto;padding:0 16px}h1{font-size:22px;line-height:1.25;margin:0 0 8px}
p{color:#3A3F47;line-height:1.5;margin:0 0 16px}
a{display:inline-block;margin:0 12px 12px 0;padding:12px 18px;border-radius:10px;background:#121416;color:#fff;text-decoration:none;font-weight:600}
a.secondary{background:#fff;color:#121416;border:1px solid #CFC9BC}
</style></head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${buttons}</main></body></html>`;

  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

// The business that ships CrazyAudios orders (the same FROM block the admin
// prints on shipping labels). Env vars override it; GSTIN only ever comes from env.
const DEFAULT_SELLER_NAME = "ElectroSupply";
const DEFAULT_SELLER_ADDRESS = [
  "Nakkara Complex, Town Hall Road",
  "Irinjalakuda, Thrissur, Kerala - 680121",
];

function sellerDetails() {
  const name = String(process.env.INVOICE_SELLER_NAME || "").trim() || DEFAULT_SELLER_NAME;
  const configuredAddress = String(process.env.INVOICE_SELLER_ADDRESS || "")
    .split(/\r?\n|\\n|\|/)
    .map((line) => line.trim())
    .filter(Boolean);
  const address = configuredAddress.length ? configuredAddress : DEFAULT_SELLER_ADDRESS;
  const gstin = String(process.env.INVOICE_SELLER_GSTIN || "").trim().toUpperCase();
  return { name, address, gstin };
}

function formatDate(value: unknown) {
  const date = value ? new Date(value as string) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value: unknown) {
  return `Rs ${roundCurrency(Number(value || 0)).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type InvoiceAddress = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

type InvoiceOrder = {
  _id: mongoose.Types.ObjectId;
  receipt: string;
  invoiceNumber: string;
  status: string;
  paymentMethod?: string;
  userId?: string | null;
  userEmail?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: InvoiceAddress;
  billingAddress?: InvoiceAddress;
  items: Array<{ name?: string; quantity?: number; unitPrice?: number; lineTotal?: number }>;
  subtotal: number;
  shippingFee: number;
  codFee?: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAt?: Date | null;
  createdAt?: Date;
};

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const token = new URL(req.url).searchParams.get("token") || "";
    const trackLink = { href: "/track-your-order", label: "Track your order" };

    if (!mongoose.isValidObjectId(id)) {
      return messagePage(404, "We couldn't find that invoice", "Please check the link from your order confirmation.", [
        trackLink,
      ]);
    }

    await dbConnect();
    const order = await Order.findById(id).lean<InvoiceOrder>();

    if (!order) {
      return messagePage(404, "We couldn't find that invoice", "Please check the link from your order confirmation.", [
        trackLink,
      ]);
    }

    // A signed link opens the invoice for anyone holding it (guest checkouts);
    // otherwise the signed-in account must own the order, or be an admin.
    let allowed = isValidOrderAccessToken(String(order._id), order.receipt, token);
    let signedIn = false;
    if (!allowed) {
      const session = await getServerSession(authOptions);
      signedIn = Boolean(session?.user);
      allowed =
        session?.user?.role === "admin" || (await isOrderOwnedBy(order, session?.user));
    }

    if (!allowed) {
      return signedIn
        ? messagePage(
            403,
            "This invoice isn't linked to your account",
            "If you checked out as a guest, use the invoice link on your order confirmation page, or find the order with Track your order.",
            [trackLink, { href: "/orders", label: "My orders" }]
          )
        : messagePage(
            401,
            "Sign in to download this invoice",
            "Invoices open for the account that placed the order, or through the link on your order confirmation and Track your order pages.",
            [
              { href: `/login?callbackUrl=${encodeURIComponent(`/api/orders/${id}/invoice`)}`, label: "Sign in" },
              trackLink,
            ]
          );
    }

    if (!CONFIRMED_ORDER_STATUSES.includes(order.status)) {
      return messagePage(
        409,
        "Your invoice isn't ready yet",
        "The invoice is issued once the payment is confirmed. If you have paid, this usually takes a few minutes.",
        [trackLink]
      );
    }

    // Paid orders whose number assignment failed earlier get it now.
    let invoiceNumber = order.invoiceNumber;
    if (isPendingInvoiceNumber(invoiceNumber)) {
      invoiceNumber = (await assignInvoiceNumber(order._id)) || invoiceNumber;
    }

    // "Tax Invoice" needs the supplier's GSTIN; without one it is a plain invoice.
    const seller = sellerDetails();
    const documentTitle = seller.gstin ? "Tax Invoice" : "Invoice";

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`${documentTitle} ${invoiceNumber}`);
    pdfDoc.setAuthor(SITE_NAME);
    let page: PDFPage = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = page.getWidth();
    const leftX = 50;
    const rightX = 320;
    const contentWidth = pageWidth - leftX * 2;
    const lineHeight = 16;
    const grey = rgb(0.38, 0.4, 0.44);

    let y = 790;
    // Starts a new page when the next block wouldn't fit above the margin.
    const ensureSpace = (needed: number) => {
      if (y - needed >= 50) return;
      page = pdfDoc.addPage([595, 842]);
      y = 790;
    };

    const drawWrappedBlock = (
      lines: string[],
      x: number,
      size = 11,
      textFont = font,
      color = rgb(0, 0, 0)
    ) => {
      for (const line of lines) {
        ensureSpace(lineHeight);
        page.drawText(toPdfText(line), { x, y, size, font: textFont, color });
        y -= lineHeight;
      }
    };

    const drawRightAlignedText = (
      text: string,
      rightEdge: number,
      textY: number,
      size = 10,
      textFont = font
    ) => {
      const safeText = toPdfText(text);
      const textWidth = textFont.widthOfTextAtSize(safeText, size);
      page.drawText(safeText, {
        x: rightEdge - textWidth,
        y: textY,
        size,
        font: textFont,
        color: rgb(0, 0, 0),
      });
    };

    const drawRule = (thickness = 1) => {
      page.drawLine({
        start: { x: leftX, y },
        end: { x: pageWidth - leftX, y },
        thickness,
        color: rgb(0.82, 0.82, 0.82),
      });
    };

    // Header: brand on the left, document title on the right.
    page.drawText(SITE_NAME, { x: leftX, y, size: 22, font: boldFont, color: rgb(0, 0, 0) });
    drawRightAlignedText(documentTitle, pageWidth - leftX, y + 2, 18, boldFont);
    y -= 16;
    page.drawText(toPdfText(SITE_URL.replace(/^https?:\/\//, "")), { x: leftX, y, size: 9, font, color: grey });
    y -= 22;

    // Seller identity: env values, else the business on the shipping labels.
    if (seller.name || seller.address.length || seller.gstin) {
      drawWrappedBlock(["Sold by"], leftX, 10, boldFont);
      const sellerLines = [
        seller.name,
        ...seller.address,
        seller.gstin ? `GSTIN: ${seller.gstin}` : "",
      ]
        .filter(Boolean)
        .flatMap((line) => wrapText(line, contentWidth, font, 10));
      drawWrappedBlock(sellerLines, leftX, 10, font);
      y -= 6;
    }

    const shippingAddress = order.shippingAddress || {};
    const info = [
      `Invoice No: ${invoiceNumber}`,
      `Invoice Date: ${formatDate(order.paymentMethod === "cod" ? order.createdAt : order.paidAt || order.createdAt)}`,
      `Order Ref: ${order.receipt}`,
      `Order Date: ${formatDate(order.createdAt)}`,
      `Payment: ${order.paymentMethod === "cod" ? "Cash on Delivery" : "Paid online (Razorpay)"}`,
      `Place of Supply: ${shippingAddress.state || "-"}`,
      `Customer: ${order.customerName || ""}`,
      `Email: ${order.customerEmail || ""}`,
      `Phone: ${order.customerPhone || ""}`,
    ];
    drawWrappedBlock(info, leftX, 11, font);

    y -= 6;
    drawRule();
    y -= 22;

    const addressLines = (address: InvoiceAddress) =>
      [
        address.name,
        address.address,
        `${address.city || ""}, ${address.state || ""} - ${address.pincode || ""}`,
        `Phone: ${address.phone || ""}`,
      ].flatMap((line) => wrapText(String(line || ""), contentWidth, font, 11));

    const billingAddress = order.billingAddress || shippingAddress;
    ensureSpace(80);
    page.drawText("Billing Address", { x: leftX, y, size: 13, font: boldFont });
    y -= 20;
    drawWrappedBlock(addressLines(billingAddress), leftX, 11, font);

    const sameAddress =
      JSON.stringify(addressLines(billingAddress)) === JSON.stringify(addressLines(shippingAddress));
    if (!sameAddress) {
      y -= 8;
      ensureSpace(80);
      page.drawText("Shipping Address", { x: leftX, y, size: 13, font: boldFont });
      y -= 20;
      drawWrappedBlock(addressLines(shippingAddress), leftX, 11, font);
    }

    y -= 10;
    drawRule();
    y -= 22;

    ensureSpace(80);
    page.drawText("Items", { x: leftX, y, size: 13, font: boldFont });
    y -= 20;

    const qtyRightX = 390;
    const unitPriceRightX = 475;
    const lineTotalRightX = pageWidth - leftX;
    const productColumnWidth = 325;

    page.drawText("Product", { x: leftX, y, size: 10, font: boldFont });
    drawRightAlignedText("Qty", qtyRightX, y, 10, boldFont);
    drawRightAlignedText("Unit Price", unitPriceRightX, y, 10, boldFont);
    drawRightAlignedText("Line Total", lineTotalRightX, y, 10, boldFont);
    y -= 11;
    drawRightAlignedText("(Incl. GST)", unitPriceRightX, y, 8, boldFont);
    drawRightAlignedText("(Incl. GST)", lineTotalRightX, y, 8, boldFont);
    y -= 10;
    drawRule(0.8);
    y -= 16;

    for (const item of order.items || []) {
      const itemLines = wrapText(String(item.name || ""), productColumnWidth, font, 10);
      ensureSpace(itemLines.length * 14 + 6);
      const itemStartY = y;

      for (const line of itemLines) {
        page.drawText(line, { x: leftX, y, size: 10, font });
        y -= 14;
      }

      drawRightAlignedText(String(item.quantity), qtyRightX, itemStartY, 10, font);
      drawRightAlignedText(formatAmount(item.unitPrice), unitPriceRightX, itemStartY, 10, font);
      drawRightAlignedText(formatAmount(item.lineTotal), lineTotalRightX, itemStartY, 10, font);

      y -= 6;
    }

    y -= 4;
    drawRule();
    y -= 24;

    // GST on courier charges covers shipping + COD fee (both GST-inclusive).
    const codFee = Number(order.codFee || 0);
    const courierCharges = roundCurrency(Number(order.shippingFee || 0) + codFee);
    const productTaxBreakdown = getTaxBreakdown(order.subtotal, shippingAddress, order.taxRate);
    const shippingTaxBreakdown = getTaxBreakdown(courierCharges, shippingAddress, order.taxRate);
    const combinedCgstAmount = roundCurrency(productTaxBreakdown.cgstAmount + shippingTaxBreakdown.cgstAmount);
    const combinedSgstAmount = roundCurrency(productTaxBreakdown.sgstAmount + shippingTaxBreakdown.sgstAmount);
    const combinedIgstAmount = roundCurrency(productTaxBreakdown.igstAmount + shippingTaxBreakdown.igstAmount);

    const summaryLines = [
      `Products Total (incl. GST): ${formatAmount(order.subtotal)}`,
      Number(order.shippingFee || 0) > 0
        ? `Shipping (incl. GST): ${formatAmount(order.shippingFee)}`
        : "Shipping: FREE",
    ];
    if (codFee > 0) summaryLines.push(`Cash on Delivery fee (incl. GST): ${formatAmount(codFee)}`);
    summaryLines.push(`GST Included (${order.taxRate}%): ${formatAmount(order.taxAmount)}`);

    if (productTaxBreakdown.zone === "intra_state") {
      summaryLines.push(`CGST (${productTaxBreakdown.cgstRate}%): ${formatAmount(combinedCgstAmount)}`);
      summaryLines.push(`SGST (${productTaxBreakdown.sgstRate}%): ${formatAmount(combinedSgstAmount)}`);
    } else {
      summaryLines.push(`IGST (${productTaxBreakdown.igstRate}%): ${formatAmount(combinedIgstAmount)}`);
    }

    ensureSpace(summaryLines.length * lineHeight + 40);
    drawWrappedBlock(summaryLines, rightX, 11, font);
    y -= 2;
    const totalLabel =
      order.paymentMethod === "cod" ? "Amount Payable on Delivery (Cash)" : "Total Paid";
    page.drawText(toPdfText(`${totalLabel}: ${formatAmount(order.totalAmount)}`), {
      x: rightX,
      y,
      size: 12,
      font: boldFont,
    });
    y -= 36;

    ensureSpace(20);
    page.drawText("This is a computer-generated invoice. Prices include GST.", {
      x: leftX,
      y,
      size: 8,
      font,
      color: grey,
    });

    const pdfBytes = await pdfDoc.save();
    const fileName = `${SITE_NAME}-${invoiceNumber}`.replace(/[^A-Za-z0-9-]+/g, "-");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("[invoice] Failed:", error);
    return messagePage(500, "We couldn't create this invoice right now", "Please try again in a minute.", [
      { href: "/track-your-order", label: "Track your order" },
    ]);
  }
}
