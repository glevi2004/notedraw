import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(__dirname, "../../packages");

const isDev = process.env.NODE_ENV === "development";
const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control referrer information sent with requests
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable unused browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Enforce HTTPS for 1 year (only effective over HTTPS, e.g. on Vercel)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // CSP in report-only mode while we tune it; Excalidraw requires unsafe-eval for math
          // Switch to Content-Security-Policy once the policy is stable.
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              // Excalidraw uses eval() for math expression evaluation
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.notedraw.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "worker-src 'self' blob:",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Transpile the local @excalidraw packages (they are raw TS source, no dist/)
  transpilePackages: [
    "@excalidraw/excalidraw",
    "@excalidraw/element",
    "@excalidraw/common",
    "@excalidraw/math",
    "@excalidraw/utils",
  ],

  // Provide Vite-style env vars for Excalidraw compatibility with Turbopack
  turbopack: {
    define: {
      "import.meta.env.PROD": isProd ? "true" : "false",
      "import.meta.env.DEV": isDev ? "true" : "false",
      "import.meta.env.PKG_NAME": '""', // empty string (falsy) so code uses fallback
      "import.meta.env.PKG_VERSION": '""',
    },
  },

  // Webpack config for use with --webpack flag
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@excalidraw/excalidraw": path.join(packagesDir, "excalidraw"),
      "@excalidraw/element": path.join(packagesDir, "element/src"),
      "@excalidraw/common": path.join(packagesDir, "common/src"),
      "@excalidraw/math": path.join(packagesDir, "math/src"),
      "@excalidraw/utils": path.join(packagesDir, "utils/src"),
    };

    // Handle .scss files from excalidraw
    config.module.rules.push({
      test: /\.scss$/,
      use: ["style-loader", "css-loader", "sass-loader"].filter(Boolean),
      include: [packagesDir],
    });

    return config;
  },
};

export default nextConfig;
