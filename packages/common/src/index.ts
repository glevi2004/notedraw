// Shim for import.meta.env in Next.js/Turbopack (Vite compatibility)
// This must be at the top before any other imports that use import.meta.env
if (typeof import.meta.env === "undefined") {
  // @ts-expect-error - polyfilling import.meta.env for Next.js
  import.meta.env = {
    MODE: process.env.NODE_ENV || "production",
    DEV: process.env.NODE_ENV === "development",
    PROD: process.env.NODE_ENV === "production",
    SSR: typeof window === "undefined",
    // Vite-specific env vars (not used in Next.js)
    VITE_WORKER_ID: undefined,
    VITE_APP_ENABLE_TRACKING: undefined,
    VITE_APP_LIBRARY_BACKEND: undefined,
    VITE_APP_LIBRARY_URL: undefined,
    VITE_APP_PLUS_LP: undefined,
    VITE_APP_DEBUG_ENABLE_TEXT_CONTAINER_BOUNDING_BOX: undefined,
    PKG_NAME: undefined,
    PKG_VERSION: undefined,
  };
}

export * from "./binary-heap";
export * from "./bounds";
export * from "./colors";
export * from "./constants";
export * from "./font-metadata";
export * from "./queue";
export * from "./keys";
export * from "./points";
export * from "./promise-pool";
export * from "./random";
export * from "./url";
export * from "./utils";
export * from "./emitter";
export * from "./editorInterface";
