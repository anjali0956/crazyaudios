export default function shouldShowCaEmblem(category?: string | null) {
  const normalizedCategory = String(category || "").trim().toLowerCase();
  return normalizedCategory !== "connectors" && normalizedCategory !== "rotary encoder";
}
