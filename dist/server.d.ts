import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export interface Todo {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    createdAt: string;
    completedAt?: string;
}
export declare function createServer(): McpServer;
