import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

type AnyArgs = any[];
type RouteHandler<TArgs extends AnyArgs> = (
  ...args: TArgs
) => Promise<NextResponse>;

/**
 * Wraps a Next.js API route handler with:
 * - Automatic exception capture to Sentry for unhandled 5xx errors
 * - Consistent JSON error shape: { error: string }
 *
 * Route handlers should still use try/catch for expected errors (4xx) and
 * call Sentry.captureException() explicitly when needed for known error paths.
 * This wrapper is the last-resort safety net for unexpected throws.
 *
 * @example
 * export const GET = withApiHandler(async (req, { params }) => {
 *   // ...
 * });
 */
export function withApiHandler<TArgs extends AnyArgs>(
  handler: RouteHandler<TArgs>,
): RouteHandler<TArgs> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (err) {
      Sentry.captureException(err);
      console.error("[API unhandled error]", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
