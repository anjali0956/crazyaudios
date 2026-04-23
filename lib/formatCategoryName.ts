export default function formatCategoryName(category: string) {
  const normalized = category.toLowerCase().trim();

  if (normalized === "brainsaudios") {
    return "BrainsAudios";
  }

  return category
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
