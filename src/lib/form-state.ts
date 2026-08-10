import type { FieldErrors } from "@/lib/validation";

/**
 * Shared shape for every `useActionState` form on the site.
 *
 * This lives outside the `"use server"` modules on purpose: a file with the
 * `"use server"` directive may only export async functions, so the initial-state
 * constants below cannot be declared alongside the actions that consume them.
 */
export interface FormState {
  ok: boolean;
  message?: string;
  errors?: FieldErrors;
}

export const emptyFormState: FormState = { ok: false };

/** Aliases kept so each area reads naturally at its call sites. */
export type ActionState = FormState;
export const emptyActionState: ActionState = { ok: false };

export type ContactState = FormState;
export const emptyContactState: ContactState = { ok: false };
