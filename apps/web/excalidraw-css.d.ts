// Type augmentations needed by Excalidraw source components

/// <reference path="../../packages/excalidraw/global.d.ts" />
/// <reference path="../../packages/excalidraw/vite-env.d.ts" />
/// <reference types="csstype" />

declare module "csstype" {
  interface Properties {
    [key: `--${string}`]: string | number | undefined;
  }
}

// SCSS module declarations
declare module "*.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module "*.scss?inline" {
  const content: string;
  export default content;
}

// WOFF2 font declarations (used by Excalidraw package)
declare module "*.woff2" {
  const src: string;
  export default src;
}

// browser-fs-access types not resolved via package.json "exports" — declare as any
// See: https://github.com/GoogleChromeLabs/browser-fs-access/issues/60
declare module "browser-fs-access" {
  export type FileSystemHandle = any;
  export const fileOpen: (...args: any[]) => any;
  export const fileSave: (...args: any[]) => any;
  export const directoryOpen: (...args: any[]) => any;
  export const supported: boolean;
}
