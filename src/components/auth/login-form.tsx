"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { loginAction, emptyFormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Checkbox, FormMessage } from "@/components/ui/form";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, emptyFormState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">
        Sign in
      </h1>
      <p className="mt-2 text-[14.5px] text-ink-muted">
        New here?{" "}
        <Link href="/register" className="text-brand-bright hover:text-mint">
          Open an account
        </Link>
        .
      </p>

      <form action={formAction} className="mt-8 space-y-5" noValidate>
        {next && <input type="hidden" name="next" value={next} />}

        {state.message && <FormMessage>{state.message}</FormMessage>}

        <Field label="Email" required error={state.errors?.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field label="Password" required error={state.errors?.password}>
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••"
              className="pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint transition-colors hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between">
          <Checkbox name="remember" label="Keep me signed in" defaultChecked />
          <Link
            href="/contact?subject=Account%20support"
            className="text-[13px] text-ink-muted transition-colors hover:text-brand-bright"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" loading={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-8 rounded-xl border border-line bg-surface/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Demo credentials
        </p>
        <dl className="mt-2.5 space-y-1.5 font-mono text-[12px] text-ink-muted">
          <div className="flex justify-between gap-3">
            <dt>Investor</dt>
            <dd className="truncate text-ink">demo@axiomcapital.example</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Admin</dt>
            <dd className="truncate text-ink">admin@axiomcapital.example</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-line pt-1.5">
            <dt>Passwords</dt>
            <dd className="truncate text-ink">Demo!2024Investor / ChangeMe!2024</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
