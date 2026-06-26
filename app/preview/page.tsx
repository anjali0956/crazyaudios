import PreviewAccessClient from "./PreviewAccessClient";

type PreviewPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function PreviewPage({
  searchParams,
}: PreviewPageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  const nextPath = String(resolvedSearchParams.next || "/");
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/";

  return <PreviewAccessClient nextPath={safeNextPath} />;
}
