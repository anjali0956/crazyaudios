import TrackYourOrderClient from "./track-your-order-client";

type TrackYourOrderPageProps = {
  searchParams?: Promise<{
    receipt?: string;
    email?: string;
  }>;
};

export default async function TrackYourOrderPage({
  searchParams,
}: TrackYourOrderPageProps) {
  const params = (await searchParams) || {};

  return (
    <TrackYourOrderClient
      initialReceipt={params.receipt || ""}
      initialEmail={params.email || ""}
    />
  );
}
