import { PageSkeleton } from "@/app/components/ui/Skeleton";

// Search results stream: show the page frame at once while the server scores
// the catalogue (FOUNDATION_API rule 2: only segments that really stream).
export default function Loading() {
  return <PageSkeleton />;
}
