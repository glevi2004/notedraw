export class SceneOpsError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SceneOpsError";
    this.code = code;
  }
}

export class PatchValidationError extends SceneOpsError {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("PATCH_VALIDATION_FAILED", `Patch validation failed: ${issues.join("; ")}`);
    this.name = "PatchValidationError";
    this.issues = issues;
  }
}

export class PatchApplyError extends SceneOpsError {
  constructor(message: string, options?: ErrorOptions) {
    super("PATCH_APPLY_FAILED", message, options);
    this.name = "PatchApplyError";
  }
}

export class RebaseError extends SceneOpsError {
  constructor(message: string, options?: ErrorOptions) {
    super("PATCH_REBASE_FAILED", message, options);
    this.name = "RebaseError";
  }
}
