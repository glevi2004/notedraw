// Type augmentations needed by Excalidraw source components

/// <reference path="../../packages/excalidraw/global.d.ts" />
/// <reference path="../../packages/excalidraw/react-app-env.d.ts" />
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
