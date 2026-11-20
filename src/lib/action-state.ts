/**
 * Format de retour commun des Server Actions utilisées avec useActionState.
 */
export type ActionState = {
  ok?: boolean;
  error?: string; // message global
  fieldErrors?: Record<string, string>; // message par champ
  message?: string; // message de succès
};

export const initialActionState: ActionState = {};

/** Transforme les erreurs zod en { champ: premier message }. Indépendant de la version de zod. */
export function toFieldErrors(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
