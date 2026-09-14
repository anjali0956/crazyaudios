export default function shouldShowCaEmblem(category?: string | null, productName?: string | null) {
  const normalizedCategory = String(category || "").trim().toLowerCase();
  const normalizedProductName = String(productName || "").trim().toLowerCase();
  const compactProductName = normalizedProductName.replace(/[^a-z0-9]/g, "");

  return (
    normalizedCategory !== "connectors" &&
    normalizedCategory !== "rotary encoder" &&
    compactProductName !== "tpa3116"
  );
}
