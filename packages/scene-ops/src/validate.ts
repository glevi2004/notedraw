import { ScenePatchSchema } from "@grovebox/ai-contracts";
import type { ZodIssue } from "zod";
import type { ScenePatchOp, ValidationResult } from "./types";

const validateOpSemantics = (op: ScenePatchOp): string | null => {
  switch (op.op) {
    case "update_element":
      if (Object.keys(op.changes).length === 0) {
        return "update_element requires at least one change";
      }
      return null;
    case "update_app_state":
      if (Object.keys(op.changes).length === 0) {
        return "update_app_state requires at least one change";
      }
      return null;
    case "replace_elements":
      if (!Array.isArray(op.elements)) {
        return "replace_elements requires an elements array";
      }
      return null;
    default:
      return null;
  }
};

export const validateScenePatch = (patch: unknown): ValidationResult => {
  const parsed = ScenePatchSchema.safeParse(patch);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue: ZodIssue) => {
        const path = issue.path.length ? issue.path.join(".") : "root";
        return `${path}: ${issue.message}`;
      }),
    };
  }

  const semanticErrors = parsed.data.ops
    .map(validateOpSemantics)
    .filter((error: string | null): error is string => Boolean(error));

  if (semanticErrors.length > 0) {
    return {
      ok: false,
      errors: semanticErrors,
    };
  }

  return {
    ok: true,
    patch: parsed.data,
  };
};
