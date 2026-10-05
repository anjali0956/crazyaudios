"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { IconLogout } from "@/app/components/icons";
import { Button } from "@/app/components/ui/Button";

/** Signs out and returns to the homepage. */
export function SignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      icon={<IconLogout size={20} />}
      loading={busy}
      loadingText="Logging out…"
      className={className}
      onClick={() => {
        setBusy(true);
        signOut({ callbackUrl: "/" });
      }}
    >
      Log out
    </Button>
  );
}
