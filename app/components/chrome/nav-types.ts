/** Slim department data the server layout passes to the menu. */
export type NavDepartment = {
  id: string;
  label: string;
  href: string;
  count: number;
  categories: Array<{ label: string; href: string; count: number }>;
};
