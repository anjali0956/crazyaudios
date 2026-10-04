"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/app/components/content/PasswordInput";
import { IconAlert, IconCheckCircle } from "@/app/components/icons";
import { Button } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Field";
import { safeCallbackPath } from "@/lib/safe-redirect";

function inputValue(form: HTMLFormElement, id: string, fallback: string) {
  const input = form.elements.namedItem(id);
  return input instanceof HTMLInputElement ? input.value : fallback;
}

const noSubscribe = () => () => {};

/**
 * "/register", carrying this page's ?callbackUrl= along so signing up and then
 * in still lands where the visitor was going. Read from the URL after
 * hydration (no useSearchParams), so the page stays static.
 */
function useRegisterHref() {
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => "");
  const target = search
    ? safeCallbackPath(new URLSearchParams(search).get("callbackUrl"), window.location.origin, "")
    : "";
  return target ? `/register?callbackUrl=${encodeURIComponent(target)}` : "/register";
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const registerHref = useRegisterHref();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read the inputs themselves: text typed or autofilled before the page
    // finished loading never reaches React state. (ids, not names, so a submit
    // before hydration can't put the password in the URL.)
    const formEmail = inputValue(e.currentTarget, "login-email", email).trim();
    const formPassword = inputValue(e.currentTarget, "login-password", password);
    setEmail(formEmail);
    setPassword(formPassword);
    setError("");
    setStatus("");
    setSubmitting(true);

    try {
      const res = await signIn("credentials", {
        email: formEmail,
        password: formPassword,
        redirect: false,
      });

      if (!res || res.error) {
        setError("Email or password is incorrect.");
        setSubmitting(false);
        return;
      }

      setStatus("Signed in. Taking you back…");
      // Read at submit time (no useSearchParams, so the page stays static).
      const target = safeCallbackPath(
        new URLSearchParams(window.location.search).get("callbackUrl"),
        window.location.origin
      );
      if (target.startsWith("/api/")) {
        // e.g. an invoice download: a full navigation, not a client-side route.
        window.location.assign(target);
        return;
      }
      router.push(target);
      router.refresh();
    } catch {
      setError("We couldn't sign you in right now. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          type="email"
          id="login-email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />

        <PasswordInput
          id="login-password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-card border border-danger/30 bg-danger-soft px-3.5 py-3 text-[14px] font-medium leading-5 text-danger"
          >
            <IconAlert size={18} className="mt-px shrink-0" />
            {error}
          </p>
        ) : null}
        {status ? (
          <p role="status" className="flex items-start gap-2 rounded-card bg-ok-soft px-3.5 py-3 text-[14px] font-medium leading-5 text-ok">
            <IconCheckCircle size={18} className="mt-px shrink-0" />
            {status}
          </p>
        ) : null}

        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Signing in…">
          Log in
        </Button>
      </form>

      <p className="mt-6 border-t border-line pt-5 text-center text-[15px] leading-[22px] text-ink-2">
        New to CrazyAudios?{" "}
        <Link
          href={registerHref}
          className="inline-flex min-h-11 items-center font-semibold text-signal-ink underline decoration-1 underline-offset-[3px] hover:decoration-2"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
