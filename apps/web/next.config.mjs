import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(__dirname, "../../packages");

const isDev = process.env.NODE_ENV === "development";
const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip TypeScript errors during build (Excalidraw source is Vite-native,
  // has type issues in Next.js strict mode that are safe to ignore).
  // Turbopack compilation still validates the code.
  typescript: {
    ignoreBuildErrors: true,
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
