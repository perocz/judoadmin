"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/auth-actions";

type Field = { name: string; label: string; type: string; autoComplete: string };

export default function AuthForm({
  action,
  fields,
  submit,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="grid max-w-sm gap-4">
      {fields.map((f) => (
        <label key={f.name} className="grid gap-1">
          <span className="label">{f.label}</span>
          <input
            className="field"
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </label>
      ))}
      {state.error && (
        <p role="alert" className="text-sm text-accent">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="border border-fg px-4 py-2 text-sm hover:border-accent hover:text-accent disabled:opacity-60">
        {pending ? "Chvíli strpení…" : submit}
      </button>
    </form>
  );
}
