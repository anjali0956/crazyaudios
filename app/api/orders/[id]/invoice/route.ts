import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    await dbConnect();

    const order = await Order.findById(id).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (
      order.status !== "paid" ||
      (order.userEmail !== session.user.email && order.customerEmail !== session.user.email)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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

    for (const line of info) {
      page.drawText(line, { x: 50, y, size: 11, font });
      y -= 18;
    }

    y -= 8;
    page.drawText("Shipping Address", { x: 50, y, size: 13, font: boldFont });
    y -= 18;
    page.drawText(order.shippingAddress.address, { x: 50, y, size: 11, font });
    y -= 16;
    page.drawText(
      `${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`,
      { x: 50, y, size: 11, font }
    );
    y -= 30;

    page.drawText("Items", { x: 50, y, size: 13, font: boldFont });
    y -= 20;
    page.drawText("Product", { x: 50, y, size: 11, font: boldFont });
    page.drawText("Qty", { x: 355, y, size: 11, font: boldFont });
    page.drawText("Unit Price", { x: 410, y, size: 11, font: boldFont });
    page.drawText("Line Total", { x: 490, y, size: 11, font: boldFont });
    y -= 16;

    for (const item of order.items) {
      page.drawText(item.name.slice(0, 40), { x: 50, y, size: 10, font });
      page.drawText(String(item.quantity), { x: 360, y, size: 10, font });
      page.drawText(`Rs ${item.unitPrice}`, { x: 410, y, size: 10, font });
      page.drawText(`Rs ${item.lineTotal}`, { x: 490, y, size: 10, font });
      y -= 16;
    }

    y -= 20;
    page.drawText(`Subtotal: Rs ${order.subtotal}`, { x: 390, y, size: 11, font });
    y -= 18;
    page.drawText(`Shipping: Rs ${order.shippingFee}`, { x: 390, y, size: 11, font });
    y -= 18;
    page.drawText(`Tax (${order.taxRate}%): Rs ${order.taxAmount}`, { x: 390, y, size: 11, font });
    y -= 18;
    page.drawText(`Total Paid: Rs ${order.totalAmount}`, { x: 390, y, size: 11, font: boldFont });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${order.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
