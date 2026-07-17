import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getTaxBreakdown, roundCurrency } from "@/lib/order-utils";

function wrapText(text: string, maxWidth: number, font: any, size: number) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
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

export async function generateInvoicePdf(order: any) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = page.getWidth();
  const leftX = 50;
  const rightX = 320;
  const contentWidth = pageWidth - leftX * 2;
  const lineHeight = 16;

  const drawWrappedBlock = (
    lines: string[],
    x: number,
    startY: number,
    size = 11,
    textFont = font
  ) => {
    let currentY = startY;
    for (const line of lines) {
      page.drawText(line, {
        x,
        y: currentY,
        size,
        font: textFont,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }
    return currentY;
  };

  let y = 790;
  page.drawText("CrazyAudios Invoice", {
    x: 50,
    y,
    size: 22,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 35;

  const info = [
    `Invoice Number: ${order.invoiceNumber}`,
    `Receipt: ${order.receipt}`,
    `Order Date: ${new Date(order.createdAt).toLocaleString("en-IN")}`,
    `Customer: ${order.customerName}`,
    `Email: ${order.customerEmail}`,
    `Phone: ${order.customerPhone}`,
  ];

  y = drawWrappedBlock(info, leftX, y, 11, font);

  y -= 6;
  page.drawLine({
    start: { x: leftX, y },
    end: { x: pageWidth - leftX, y },
    thickness: 1,
    color: rgb(0.82, 0.82, 0.82),
  });
  y -= 22;

  page.drawText("Shipping Address", { x: leftX, y, size: 13, font: boldFont });
  y -= 20;

  const shippingLines = [
    order.shippingAddress.name,
    order.shippingAddress.address,
    `${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
    `Phone: ${order.shippingAddress.phone}`,
  ].flatMap((line) => wrapText(String(line || ""), contentWidth, font, 11));

  y = drawWrappedBlock(shippingLines, leftX, y, 11, font);
  y -= 10;

  page.drawLine({
    start: { x: leftX, y },
    end: { x: pageWidth - leftX, y },
    thickness: 1,
    color: rgb(0.82, 0.82, 0.82),
  });
  y -= 22;

  page.drawText("Items", { x: 50, y, size: 13, font: boldFont });
  y -= 20;
  page.drawText("Product", { x: leftX, y, size: 11, font: boldFont });
  page.drawText("Qty", { x: 390, y, size: 11, font: boldFont });
  page.drawText("Unit Price (Incl. GST)", { x: 430, y, size: 11, font: boldFont });
  page.drawText("Line Total", { x: 510, y, size: 11, font: boldFont });
  y -= 12;

  page.drawLine({
    start: { x: leftX, y },
    end: { x: pageWidth - leftX, y },
    thickness: 0.8,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 16;

  for (const item of order.items) {
    const itemLines = wrapText(String(item.name || ""), 325, font, 10);
    const itemStartY = y;
    let itemY = y;

    for (const line of itemLines) {
      page.drawText(line, { x: leftX, y: itemY, size: 10, font });
      itemY -= 14;
    }

    page.drawText(String(item.quantity), { x: 395, y: itemStartY, size: 10, font });
    page.drawText(`Rs ${item.unitPrice}`, { x: 432, y: itemStartY, size: 10, font });
    page.drawText(`Rs ${item.lineTotal}`, { x: 510, y: itemStartY, size: 10, font });

    y = itemY - 6;
  }

  y -= 4;
  page.drawLine({
    start: { x: leftX, y },
    end: { x: pageWidth - leftX, y },
    thickness: 1,
    color: rgb(0.82, 0.82, 0.82),
  });
  y -= 24;

  const productTaxBreakdown = getTaxBreakdown(order.subtotal, order.shippingAddress, order.taxRate);
  const shippingTaxBreakdown = getTaxBreakdown(order.shippingFee, order.shippingAddress, order.taxRate);
  const combinedCgstAmount = roundCurrency(
    productTaxBreakdown.cgstAmount + shippingTaxBreakdown.cgstAmount
  );
  const combinedSgstAmount = roundCurrency(
    productTaxBreakdown.sgstAmount + shippingTaxBreakdown.sgstAmount
  );
  const combinedIgstAmount = roundCurrency(
    productTaxBreakdown.igstAmount + shippingTaxBreakdown.igstAmount
  );

  const summaryLines = [
    `Products Total (incl. GST): Rs ${order.subtotal}`,
    `Courier (incl. GST): Rs ${order.shippingFee}`,
    `GST Included (${order.taxRate}%): Rs ${order.taxAmount}`,
  ];

  if (productTaxBreakdown.zone === "intra_state") {
    summaryLines.push(
      `CGST (${productTaxBreakdown.cgstRate}%): Rs ${combinedCgstAmount}  |  SGST (${productTaxBreakdown.sgstRate}%): Rs ${combinedSgstAmount}`
    );
  } else {
    summaryLines.push(`IGST (${productTaxBreakdown.igstRate}%): Rs ${combinedIgstAmount}`);
  }

  y = drawWrappedBlock(summaryLines, rightX, y, 11, font);
  y -= 2;
  page.drawText(`Total Paid: Rs ${order.totalAmount}`, {
    x: rightX,
    y,
    size: 12,
    font: boldFont,
  });

  return pdfDoc.save();
}
