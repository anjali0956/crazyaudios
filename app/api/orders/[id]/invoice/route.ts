import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

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

    const pdfBytes = await generateInvoicePdf(order);

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
