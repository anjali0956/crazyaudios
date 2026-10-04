import Product from "@/models/Product";

export type StockLine = {
  productId: unknown;
  name?: string;
  quantity: number;
};

function quantityOf(line: StockLine) {
  return Math.max(0, Math.floor(Number(line.quantity) || 0));
}

export async function returnStock(lines: StockLine[]) {
  for (const line of lines) {
    const quantity = quantityOf(line);
    if (quantity) await Product.updateOne({ _id: line.productId }, { $inc: { stock: quantity } });
  }
}

// All or nothing: each decrement only happens if enough stock is left, and a
// shortfall puts back whatever this call already took. Stock never goes negative.
export async function takeStock(
  lines: StockLine[]
): Promise<{ ok: true } | { ok: false; shortItem: string }> {
  const taken: StockLine[] = [];

  for (const line of lines) {
    const quantity = quantityOf(line);
    if (!quantity) continue;

    let updated = false;
    try {
      const result = await Product.updateOne(
        { _id: line.productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } }
      );
      updated = result.modifiedCount === 1;
    } catch (error) {
      await returnStock(taken);
      throw error;
    }

    if (!updated) {
      await returnStock(taken);
      return { ok: false, shortItem: String(line.name || line.productId) };
    }
    taken.push({ productId: line.productId, quantity });
  }

  return { ok: true };
}
