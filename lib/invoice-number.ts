import Counter from "@/models/Counter";
import Order from "@/models/Order";

// Invoice numbers: CA/2026-27/000123, one gap-free sequence per Indian
// financial year (April to March, IST). A number is given only when an order
// becomes paid or a COD order is confirmed; until then the order carries a
// unique placeholder (the invoiceNumber index is unique). Orders created before
// this scheme keep their old INV-... numbers.

const PENDING_PREFIX = "PENDING-";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function pendingInvoiceNumber(receipt: string) {
  return `${PENDING_PREFIX}${receipt}`;
}

export function isPendingInvoiceNumber(value: unknown) {
  return typeof value === "string" && value.startsWith(PENDING_PREFIX);
}

export function financialYearLabel(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const startYear = ist.getUTCMonth() >= 3 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function formatInvoiceNumber(financialYear: string, sequence: number) {
  return `CA/${financialYear}/${String(sequence).padStart(6, "0")}`;
}

async function nextSequence(key: string) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after" }
      ).lean<{ seq: number }>();
      if (counter?.seq) return counter.seq;
      throw new Error(`Counter ${key} returned no sequence`);
    } catch (error) {
      // Two first-ever upserts can race on the same _id; the retry increments.
      const duplicate = (error as { code?: number })?.code === 11000;
      if (!duplicate || attempt >= 2) throw error;
    }
  }
}

export async function nextInvoiceNumber(date = new Date()) {
  const financialYear = financialYearLabel(date);
  const sequence = await nextSequence(`invoice:${financialYear}`);
  return formatInvoiceNumber(financialYear, sequence);
}

// Gives the order its real invoice number if it still has a placeholder and
// returns the number it ends up with. Call it from the code path that confirmed
// the order (only one caller wins that transition, so no number is wasted).
export async function assignInvoiceNumber(orderId: unknown): Promise<string | null> {
  const order = await Order.findById(orderId).select("invoiceNumber").lean<{ invoiceNumber?: string }>();
  if (!order) return null;
  if (!isPendingInvoiceNumber(order.invoiceNumber)) return order.invoiceNumber || null;

  const invoiceNumber = await nextInvoiceNumber();
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, invoiceNumber: order.invoiceNumber },
    { $set: { invoiceNumber } },
    { returnDocument: "after" }
  )
    .select("invoiceNumber")
    .lean<{ invoiceNumber?: string }>();

  if (updated) return updated.invoiceNumber || invoiceNumber;

  // Someone else assigned it in between; theirs stands.
  const current = await Order.findById(orderId).select("invoiceNumber").lean<{ invoiceNumber?: string }>();
  return current?.invoiceNumber || null;
}
