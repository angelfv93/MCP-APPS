import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

const TODOS_FILE = path.join(import.meta.dirname, "todos.json");

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

async function loadTodos(): Promise<Todo[]> {
  try {
    const raw = await fs.readFile(TODOS_FILE, "utf-8");
    return JSON.parse(raw) as Todo[];
  } catch {
    return [];
  }
}

async function saveTodos(todos: Todo[]): Promise<void> {
  await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2), "utf-8");
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function todosToResult(todos: Todo[]): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(todos) }] };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Gestor de Pendientes",
    version: "1.0.0",
  });

  const resourceUri = "ui://pendientes/mcp-app.html";

  registerAppTool(
    server,
    "manage-todos",
    {
      title: "Gestor de Pendientes",
      description: "Abre la interfaz para gestionar la lista de pendientes.",
      inputSchema: {},
      _meta: { ui: { resourceUri } },
    },
    async (): Promise<CallToolResult> => {
      const todos = await loadTodos();
      return todosToResult(todos);
    },
  );

  registerAppTool(
    server,
    "add-todo",
    {
      title: "Agregar pendiente",
      description: "Agrega un nuevo pendiente a la lista.",
      inputSchema: {
        title: z.string().min(1),
        description: z.string().optional(),
      },
      _meta: { ui: { resourceUri, visibility: ["app"] } },
    },
    async ({ title, description }): Promise<CallToolResult> => {
      const todos = await loadTodos();
      const newTodo: Todo = {
        id: generateId(),
        title,
        description,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      todos.push(newTodo);
      await saveTodos(todos);
      return todosToResult(todos);
    },
  );

  registerAppTool(
    server,
    "update-todo",
    {
      title: "Actualizar pendiente",
      description: "Actualiza el título y descripción de un pendiente existente.",
      inputSchema: {
        id: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
      },
      _meta: { ui: { resourceUri, visibility: ["app"] } },
    },
    async ({ id, title, description }): Promise<CallToolResult> => {
      const todos = await loadTodos();
      const todo = todos.find((t) => t.id === id);
      if (!todo) {
        return { isError: true, content: [{ type: "text", text: `Pendiente con id "${id}" no encontrado.` }] };
      }
      todo.title = title;
      todo.description = description;
      await saveTodos(todos);
      return todosToResult(todos);
    },
  );

  registerAppTool(
    server,
    "delete-todo",
    {
      title: "Eliminar pendiente",
      description: "Elimina un pendiente de la lista.",
      inputSchema: {
        id: z.string(),
      },
      _meta: { ui: { resourceUri, visibility: ["app"] } },
    },
    async ({ id }): Promise<CallToolResult> => {
      const todos = await loadTodos();
      const filtered = todos.filter((t) => t.id !== id);
      if (filtered.length === todos.length) {
        return { isError: true, content: [{ type: "text", text: `Pendiente con id "${id}" no encontrado.` }] };
      }
      await saveTodos(filtered);
      return todosToResult(filtered);
    },
  );

  registerAppTool(
    server,
    "complete-todo",
    {
      title: "Completar pendiente",
      description: "Marca un pendiente como completado y registra la fecha/hora de completado.",
      inputSchema: {
        id: z.string(),
      },
      _meta: { ui: { resourceUri, visibility: ["app"] } },
    },
    async ({ id }): Promise<CallToolResult> => {
      const todos = await loadTodos();
      const todo = todos.find((t) => t.id === id);
      if (!todo) {
        return { isError: true, content: [{ type: "text", text: `Pendiente con id "${id}" no encontrado.` }] };
      }
      todo.completed = true;
      todo.completedAt = new Date().toISOString();
      await saveTodos(todos);
      return todosToResult(todos);
    },
  );

  registerAppTool(
    server,
    "uncomplete-todo",
    {
      title: "Descompletar pendiente",
      description: "Desmarca un pendiente como completado.",
      inputSchema: {
        id: z.string(),
      },
      _meta: { ui: { resourceUri, visibility: ["app"] } },
    },
    async ({ id }): Promise<CallToolResult> => {
      const todos = await loadTodos();
      const todo = todos.find((t) => t.id === id);
      if (!todo) {
        return { isError: true, content: [{ type: "text", text: `Pendiente con id "${id}" no encontrado.` }] };
      }
      todo.completed = false;
      delete todo.completedAt;
      await saveTodos(todos);
      return todosToResult(todos);
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");
      return {
        contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }],
      };
    },
  );

  return server;
}
