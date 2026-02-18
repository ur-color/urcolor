# Documentation and Tooling Guidelines

## Documentation Style

### Guide Pages (`docs/guide/vue/*.md`)

Guide pages follow a step-by-step tutorial structure:

1. **Title**: `# Build a [Component Name]`
2. **Preview**: `<script setup>` importing a demo component, then "Here's what we'll end up with:" + `<DemoComponent />`
3. **Step 1: Set up state** — `shallowRef` + `Color.parse()`
4. **Step 2: Add the root** — Root component with color-space/channel props
5. **Step 3: Add the track/gradient** — Track + Gradient components
6. **Step 4: Add the thumb** — Thumb component with Tailwind styling
7. Additional sections (orientation, channels, events, etc.)
8. `::: tip` about unstyled components after final step

Code blocks use `vue` language tag with `[!code ++]` and `[!code ++:N]` annotations for incremental additions.

### Component Reference Pages (`docs/components/vue/*.md`)

Component pages follow this structure:

1. **Title**: `# ComponentName`
2. **Description**: One-sentence purpose
3. **Examples**: `## Examples` with demo components rendered inline + source shown via `<<< @/components/vue/demo/Example.vue`
4. **Usage**: `## Usage` with basic code example
5. **API Reference**: Tables with Prop, Type, Default, Description columns
6. **Keyboard Navigation**: Table of key/action pairs

### Demo Components (`docs/guide/vue/demo/*.vue`)

- Import order: Vue composables → `import "internationalized-color/css"` → Color model → `@urcolor/vue` components
- Use `shallowRef<Color>(Color.parse("hsl(210, 80%, 50%)")!)` for color state
- Use `as="div"` on all components
- Use `style="container-type: inline-size"` on root components
- Thumb styling: Tailwind classes with `transform-(--reka-slider-area-thumb-transform)` for auto-positioning

### Sidebar Registration

**Always add new pages to the sidebar** in `docs/.vitepress/config.ts`. The sidebar has two sections:
- `/guide/` — "Getting Started" + "Vue Tutorials"
- `/components/` — "Components" + "Vue"

### Tooling

- Use `bun run docs:build` to verify docs build without errors
- Use `bun run docs:dev` to preview locally

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.
