"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import axios from "axios";
import { PasswordInput } from "@/app/components/content/PasswordInput";
import { IconAlert, IconCheckCircle } from "@/app/components/icons";
import { Button, ButtonLink } from "@/app/components/ui/Button";
import { Input } from "@/app/components/ui/Field";
import { safeCallbackPath } from "@/lib/safe-redirect";

function inputValue(form: HTMLFormElement, id: string, fallback: string) {
  const input = form.elements.namedItem(id);
  return input instanceof HTMLInputElement ? input.value : fallback;
}

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

const noSubscribe = () => () => {};

/**
 * "/login", carrying this page's ?callbackUrl= along. Read from the URL after
 * hydration (no useSearchParams), so the page stays static.
 */
function useLoginHref() {
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => "");
  const target = search
    ? safeCallbackPath(new URLSearchParams(search).get("callbackUrl"), window.location.origin, "")
    : "";
  return target ? `/login?callbackUrl=${encodeURIComponent(target)}` : "/login";
}

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const loginHref = useLoginHref();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Read the inputs themselves: text typed or autofilled before the page
    // finished loading never reaches React state. (ids, not names, so a submit
    // before hydration can't put the password in the URL.)
    const form = e.currentTarget;
    const values = {
      name: inputValue(form, "register-name", name),
      email: inputValue(form, "register-email", email),
      password: inputValue(form, "register-password", password),
    };
    setName(values.name);
    setEmail(values.email);
    setPassword(values.password);
    setError("");
    setFieldErrors({});
    setSuccess(false);
    setSubmitting(true);

    try {
      await axios.post("/api/register", values);

      setSuccess(true);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      const data = axios.isAxiosError(err) ? err.response?.data : null;
      setFieldErrors((data?.fieldErrors as FieldErrors) || {});
      setError(data?.error || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div role="status" className="text-center">
        <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok-soft text-ok">
          <IconCheckCircle size={28} />
        </span>
        <p className="type-h3 mt-4 text-ink">Account created</p>
        <p className="mt-1.5 text-[15px] leading-[22px] text-ink-2">You can log in now with your email and password.</p>
        <ButtonLink href={loginHref} size="lg" fullWidth className="mt-6">
          Log in
        </ButtonLink>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleRegister} className="space-y-4">
        <Input
          type="text"
          id="register-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          autoCapitalize="words"
          error={fieldErrors.name}
          required
        />

        <Input
          type="email"
          id="register-email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          error={fieldErrors.email}
          required
        />

        <PasswordInput
          id="register-password"
          label="Password"
          hint={fieldErrors.password ? undefined : "At least 8 characters."}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          error={fieldErrors.password}
          required
        />

        {error && !Object.keys(fieldErrors).length ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-card border border-danger/30 bg-danger-soft px-3.5 py-3 text-[14px] font-medium leading-5 text-danger"
          >
            <IconAlert size={18} className="mt-px shrink-0" />
            {error}
          </p>
        ) : error ? (
          <p role="alert" className="sr-only">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" fullWidth loading={submitting} loadingText="Creating account…">
          Create account
        </Button>
      </form>

      <p className="mt-6 border-t border-line pt-5 text-center text-[15px] leading-[22px] text-ink-2">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="inline-flex min-h-11 items-center font-semibold text-signal-ink underline decoration-1 underline-offset-[3px] hover:decoration-2"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
