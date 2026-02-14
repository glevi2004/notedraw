declare module "@upstash/redis" {
  export class Redis {
    constructor(config: { url: string; token: string });
    set(key: string, value: unknown, options?: { ex?: number }): Promise<void>;
    get(key: string): Promise<unknown>;
  }
}

declare module "@modelcontextprotocol/ext-apps" {
  export type App = any;
}

declare module "@modelcontextprotocol/ext-apps/react" {
  export const useApp: any;
}

declare module "@modelcontextprotocol/ext-apps/server" {
  export const RESOURCE_MIME_TYPE: string;
  export const registerAppTool: (...args: any[]) => any;
  export const registerAppResource: (...args: any[]) => any;
}

declare module "@modelcontextprotocol/sdk/server/mcp.js" {
  export class McpServer {
    constructor(config: any);
    registerTool(...args: any[]): any;
    connect(transport: any): Promise<void>;
    close(): Promise<void>;
  }
}

declare module "@modelcontextprotocol/sdk/server/express.js" {
  export const createMcpExpressApp: (...args: any[]) => any;
}

declare module "@modelcontextprotocol/sdk/server/stdio.js" {
  export class StdioServerTransport {
    constructor(...args: any[]);
  }
}

declare module "@modelcontextprotocol/sdk/server/streamableHttp.js" {
  export class StreamableHTTPServerTransport {
    constructor(...args: any[]);
    close(): Promise<void>;
    handleRequest(...args: any[]): Promise<void>;
  }
}

declare module "@modelcontextprotocol/sdk/types.js" {
  export type CallToolResult = any;
  export type ReadResourceResult = any;
}

declare module "@excalidraw/excalidraw" {
  export const Excalidraw: any;
  export const exportToSvg: any;
  export const convertToExcalidrawElements: any;
  export const restore: any;
  export const CaptureUpdateAction: any;
  export const FONT_FAMILY: any;
  export const serializeAsJSON: any;
}

declare module "morphdom" {
  const morphdom: (...args: any[]) => any;
  export default morphdom;
}

declare module "cors" {
  const cors: (...args: any[]) => any;
  export default cors;
}

declare module "express" {
  export type Request = any;
  export type Response = any;
}

declare module "mcp-handler" {
  export const createMcpHandler: (...args: any[]) => any;
}
