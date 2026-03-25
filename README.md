# Gestor de Pendientes — MCP App

Aplicación [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) para gestionar una lista de pendientes con interfaz interactiva. Construida con **Vanilla HTML + CSS + TypeScript** y empaquetada con Vite como un único archivo HTML que el servidor sirve como recurso MCP.

---

## ✨ Características

- ✅ **Registrar** pendientes (título obligatorio, descripción opcional)
- 📋 **Visualizar** la lista con filtros: Todos / Pendientes / Completados
- ✏️ **Editar** título y descripción de cualquier pendiente
- 🗑️ **Eliminar** con diálogo de confirmación
- ☑️ **Marcar como completado** o revertir el estado
- 📅 **Registro de fechas**: fecha/hora de creación y fecha/hora de completado
- 💾 **Persistencia**: los datos se guardan en `todos.json` y se cargan al iniciar

---

## 🚀 Inicio rápido

### Requisitos

- [Node.js](https://nodejs.org/) >= 18
- [Bun](https://bun.sh/) (para ejecutar el servidor en modo watch)
- npm >= 8

### Instalación

```bash
npm install
```

### Ejecutar

```bash
# Build + servidor HTTP en http://localhost:3001/mcp
npm start

# Build + modo stdio (para clientes MCP que usan stdio)
npm run start:stdio
```

---

## 🛠️ Desarrollo

```bash
# Vite en modo watch + servidor con hot reload
npm run dev
```

Comandos individuales:

| Comando | Descripción |
|---|---|
| `npm run build` | Compila la UI con Vite y verifica TypeScript |
| `npm run watch` | Vite en modo watch (solo UI) |
| `npm run serve` | Inicia el servidor MCP (HTTP) |
| `npm run serve:stdio` | Inicia el servidor MCP (stdio) |

---

## 📁 Estructura del proyecto

```
MCP-APPS/
├── main.ts              # Entry point: HTTP (puerto 3001) y modo stdio
├── server.ts            # Servidor MCP: tools CRUD + resource UI
├── mcp-app.html         # Entry point de Vite para la interfaz
├── src/
│   ├── mcp-app.ts       # Lógica cliente Vanilla TS + lifecycle App MCP
│   ├── global.css       # Variables de host y estilos base
│   └── mcp-app.css      # Estilos de la aplicación
├── dist/
│   └── mcp-app.html     # UI compilada (generada por Vite, servida por el servidor)
├── todos.json           # Persistencia de pendientes (creado en tiempo de ejecución)
├── package.json
├── tsconfig.json        # Configuración TypeScript (cliente)
├── tsconfig.server.json # Configuración TypeScript (servidor)
└── vite.config.ts
```

---

## 🔧 Tools MCP registrados

El servidor expone las siguientes herramientas MCP:

| Tool | Visibilidad | Descripción |
|---|---|---|
| `manage-todos` | Pública | Abre la interfaz y carga la lista inicial |
| `add-todo` | Solo App | Agrega un nuevo pendiente |
| `update-todo` | Solo App | Edita título y descripción |
| `delete-todo` | Solo App | Elimina un pendiente |
| `complete-todo` | Solo App | Marca como completado (registra `completedAt`) |
| `uncomplete-todo` | Solo App | Desmarca como completado |

Todas las operaciones devuelven la lista completa actualizada en `content[0].text` (JSON).

---

## 📄 Formato de `todos.json`

```ts
interface Todo {
  id: string;          // Identificador único
  title: string;       // Título del pendiente
  description?: string; // Descripción opcional
  completed: boolean;  // Estado
  createdAt: string;   // ISO 8601 — fecha de registro
  completedAt?: string; // ISO 8601 — fecha de completado
}
```

---

## 🔄 Restablecer datos

Para reiniciar la lista, detener el servidor y eliminar o editar `todos.json`:

```bash
# Eliminar todos los pendientes
del todos.json   # Windows
rm todos.json    # macOS / Linux
```

---

## 📦 Stack tecnológico

| Tecnología | Uso |
|---|---|
| [`@modelcontextprotocol/ext-apps`](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps) | SDK cliente para MCP Apps |
| [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) | SDK servidor MCP |
| [Vite](https://vite.dev/) + [`vite-plugin-singlefile`](https://www.npmjs.com/package/vite-plugin-singlefile) | Build de la UI en un solo HTML |
| [Express](https://expressjs.com/) | Servidor HTTP para transporte Streamable HTTP |
| [Zod](https://zod.dev/) | Validación de esquemas en los tools MCP |
| TypeScript | Tipado estático en cliente y servidor |
