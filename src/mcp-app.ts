/**
 * @file Gestor de Pendientes — MCP App (Vanilla TS)
 *
 * Lifecycle:
 *  1. Create App instance
 *  2. Register handlers BEFORE connect()
 *  3. call app.connect()
 *  4. Load initial todos via manage-todos tool
 */
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./global.css";
import "./mcp-app.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

type Filter = "all" | "pending" | "completed";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let todos: Todo[] = [];
let currentFilter: Filter = "all";
let pendingDeleteId: string | null = null;


// ---------------------------------------------------------------------------
// DOM References
// ---------------------------------------------------------------------------
const appMain = document.getElementById("app-main") as HTMLElement;
const todoForm = document.getElementById("todo-form") as HTMLFormElement;
const formTitle = document.getElementById("form-title") as HTMLHeadingElement;
const editIdInput = document.getElementById("edit-id") as HTMLInputElement;
const titleInput = document.getElementById("input-title") as HTMLInputElement;
const descInput = document.getElementById("input-description") as HTMLTextAreaElement;
const titleError = document.getElementById("title-error") as HTMLSpanElement;
const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement;
const cancelBtn = document.getElementById("cancel-btn") as HTMLButtonElement;
const filterBtns = document.querySelectorAll<HTMLButtonElement>(".filter-btn");
const todoList = document.getElementById("todo-list") as HTMLUListElement;
const emptyState = document.getElementById("empty-state") as HTMLParagraphElement;
const todoCountEl = document.getElementById("todo-count") as HTMLSpanElement;
const confirmDialog = document.getElementById("confirm-dialog") as HTMLDialogElement;
const confirmOkBtn = document.getElementById("confirm-ok") as HTMLButtonElement;
const confirmCancelBtn = document.getElementById("confirm-cancel") as HTMLButtonElement;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
function setLoading(loading: boolean): void {
  submitBtn.disabled = loading;
  const existing = document.querySelector(".loading-overlay");
  if (loading && !existing) {
    const overlay = document.createElement("div");
    overlay.className = "loading-overlay";
    overlay.innerHTML = `<div class="loading-spinner"></div>`;
    appMain.appendChild(overlay);
  } else if (!loading && existing) {
    existing.remove();
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function getFilteredTodos(): Todo[] {
  switch (currentFilter) {
    case "pending":   return todos.filter((t) => !t.completed);
    case "completed": return todos.filter((t) => t.completed);
    default:          return todos;
  }
}

function renderTodos(): void {
  const filtered = getFilteredTodos();

  // Update count label
  const pending = todos.filter((t) => !t.completed).length;
  todoCountEl.textContent = `${pending} pendiente${pending !== 1 ? "s" : ""}`;

  todoList.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const todo of filtered) {
    todoList.appendChild(createTodoCard(todo));
  }
}

function createTodoCard(todo: Todo): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `todo-card${todo.completed ? " completed" : ""}`;
  li.dataset["id"] = todo.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "todo-check";
  checkbox.checked = todo.completed;
  checkbox.setAttribute("aria-label", todo.completed ? "Marcar como pendiente" : "Marcar como completado");
  checkbox.addEventListener("change", () => handleToggleComplete(todo.id, !todo.completed));

  const content = document.createElement("div");
  content.className = "todo-content";

  const titleEl = document.createElement("span");
  titleEl.className = "todo-title";
  titleEl.textContent = todo.title;

  content.appendChild(titleEl);

  if (todo.description) {
    const descEl = document.createElement("p");
    descEl.className = "todo-description";
    descEl.textContent = todo.description;
    content.appendChild(descEl);
  }

  const meta = document.createElement("div");
  meta.className = "todo-meta";

  const createdBadge = document.createElement("span");
  createdBadge.className = "meta-badge created";
  createdBadge.textContent = `📅 ${formatDate(todo.createdAt)}`;
  createdBadge.title = "Fecha de registro";
  meta.appendChild(createdBadge);

  if (todo.completedAt) {
    const doneBadge = document.createElement("span");
    doneBadge.className = "meta-badge done";
    doneBadge.textContent = `✅ ${formatDate(todo.completedAt)}`;
    doneBadge.title = "Fecha de completado";
    meta.appendChild(doneBadge);
  }

  content.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "todo-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn-icon";
  editBtn.textContent = "✏️";
  editBtn.title = "Editar";
  editBtn.setAttribute("aria-label", `Editar: ${todo.title}`);
  editBtn.addEventListener("click", () => openEditMode(todo));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn-icon";
  deleteBtn.textContent = "🗑️";
  deleteBtn.title = "Eliminar";
  deleteBtn.setAttribute("aria-label", `Eliminar: ${todo.title}`);
  deleteBtn.addEventListener("click", () => openDeleteConfirm(todo.id, todo.title));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  li.appendChild(checkbox);
  li.appendChild(content);
  li.appendChild(actions);

  return li;
}

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------
function resetForm(): void {
  editIdInput.value = "";
  titleInput.value = "";
  descInput.value = "";
  titleError.hidden = true;
  titleInput.classList.remove("invalid");
  formTitle.textContent = "Nuevo Pendiente";
  submitBtn.textContent = "Agregar";
  cancelBtn.hidden = true;
}

function openEditMode(todo: Todo): void {
  editIdInput.value = todo.id;
  titleInput.value = todo.title;
  descInput.value = todo.description ?? "";
  titleError.hidden = true;
  titleInput.classList.remove("invalid");
  formTitle.textContent = "Editar Pendiente";
  submitBtn.textContent = "Guardar";
  cancelBtn.hidden = false;
  titleInput.focus();
  titleInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------
function openDeleteConfirm(id: string, title: string): void {
  pendingDeleteId = id;
  const msg = document.getElementById("confirm-message") as HTMLParagraphElement;
  msg.textContent = `¿Eliminar "${title}"? Esta acción no se puede deshacer.`;
  confirmDialog.showModal();
}

// ---------------------------------------------------------------------------
// App tool calls
// ---------------------------------------------------------------------------
let mcpApp: App | null = null;

async function callTool(name: string, args: Record<string, unknown>): Promise<Todo[]> {
  if (!mcpApp) throw new Error("MCP App not connected");
  const result: CallToolResult = await mcpApp.callServerTool({ name, arguments: args });
  if (result.isError) {
    const msg = (result.content?.[0] as { text?: string } | undefined)?.text ?? "Error desconocido";
    throw new Error(msg);
  }
  const text = (result.content?.[0] as { text?: string } | undefined)?.text ?? "[]";
  return JSON.parse(text) as Todo[];
}

async function handleSubmit(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const titleVal = titleInput.value.trim();
  if (!titleVal) {
    titleError.hidden = false;
    titleInput.classList.add("invalid");
    titleInput.focus();
    return;
  }
  titleError.hidden = true;
  titleInput.classList.remove("invalid");

  const descVal = descInput.value.trim() || undefined;
  const editId = editIdInput.value;

  setLoading(true);
  try {
    if (editId) {
      todos = await callTool("update-todo", { id: editId, title: titleVal, description: descVal });
    } else {
      todos = await callTool("add-todo", { title: titleVal, description: descVal });
    }
    resetForm();
    renderTodos();
  } catch (err) {
    console.error("Error guardando pendiente:", err);
    alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    setLoading(false);
  }
}

async function handleToggleComplete(id: string, shouldComplete: boolean): Promise<void> {
  setLoading(true);
  try {
    todos = await callTool(shouldComplete ? "complete-todo" : "uncomplete-todo", { id });
    renderTodos();
  } catch (err) {
    console.error("Error cambiando estado:", err);
    renderTodos(); // revert UI
  } finally {
    setLoading(false);
  }
}

async function handleDelete(id: string): Promise<void> {
  setLoading(true);
  try {
    todos = await callTool("delete-todo", { id });
    // If we were editing this todo, reset the form
    if (editIdInput.value === id) resetForm();
    renderTodos();
  } catch (err) {
    console.error("Error eliminando pendiente:", err);
  } finally {
    setLoading(false);
  }
}

// ---------------------------------------------------------------------------
// Host context
// ---------------------------------------------------------------------------
function handleHostContextChanged(ctx: McpUiHostContext): void {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    appMain.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    appMain.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    appMain.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    appMain.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
todoForm.addEventListener("submit", (e) => { void handleSubmit(e); });

cancelBtn.addEventListener("click", resetForm);

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    currentFilter = btn.dataset["filter"] as Filter;
    renderTodos();
  });
});

confirmOkBtn.addEventListener("click", () => {
  confirmDialog.close();
  if (pendingDeleteId) {
    void handleDelete(pendingDeleteId);
    pendingDeleteId = null;
  }
});

confirmCancelBtn.addEventListener("click", () => {
  confirmDialog.close();
  pendingDeleteId = null;
});

titleInput.addEventListener("input", () => {
  if (titleInput.value.trim()) {
    titleError.hidden = true;
    titleInput.classList.remove("invalid");
  }
});

// ---------------------------------------------------------------------------
// MCP App lifecycle
// ---------------------------------------------------------------------------
const app = new App({ name: "Gestor de Pendientes", version: "1.0.0" });

app.onteardown = async () => {
  console.info("App siendo desmontada");
  return {};
};

app.ontoolresult = (result) => {
  console.info("Tool result recibido:", result);
};

app.onerror = (err) => {
  console.error("MCP App error:", err);
};

app.onhostcontextchanged = (params) => {
  handleHostContextChanged(params as McpUiHostContext);
};

// Connect and load initial todos
app.connect().then(async () => {
  mcpApp = app;
  const ctx = app.getHostContext();
  if (ctx) handleHostContextChanged(ctx);

  // Load todos via the main tool result on tool call
  try {
    todos = await callTool("manage-todos", {});
  } catch (err) {
    console.error("Error cargando pendientes:", err);
  }
  renderTodos();
});
