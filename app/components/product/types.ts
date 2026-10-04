/**
 * What the product page's client islands need: serialisable, with the raw
 * values the cart and Meta payloads expect (raw name, stored price) next to
 * the customer-facing ones.
 */
export type PdpBuyProduct = {
  _id: string;
  /** Raw name as stored: cart line, Meta content_name, WhatsApp message. */
  name: string;
  /** Stored GST-inclusive unit price, before any flash sale. */
  price: number;
  image: string;
  stock: number;
  packSize: number | null;
  flashSale: boolean;
  discountPercentage: number;
  /** Raw category (Meta content_category). */
  category: string;
  /** Customer-facing title, as in the H1. */
  title: string;
  /** Price of the smallest sellable quantity (unit price x pack). */
  sellPrice: number;
  /** Customer price per unit (flash sale applied). */
  unitPrice: number;
  /** 1, or the pack size. */
  minQty: number;
};
