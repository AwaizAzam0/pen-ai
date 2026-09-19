# Pen AI — an AI design assistant plugin for Penpot

Select a shape, image or SVG on the canvas → click **✨ Ask Pen AI** in the
panel → describe the change in plain language → Claude decides whether to
recolor it, apply a gradient, or generate a replacement SVG, and the plugin
applies it live.

## Honest limitation vs. Figma AI / Cursor

Penpot plugins only get a fixed side panel (`penpot.ui.open`) — there's no
API to draw a floating icon that tracks your cursor and sits directly next
to a shape on the canvas the way Figma's AI assistant does. So instead: the
panel reacts to your selection (via the `selectionchange` event) and shows
the "Ask Pen AI" trigger there. Functionally it's the same flow (select →
click the AI icon → prompt → apply); it just lives in the panel rather than
floating over the shape.

Also: Penpot's API can restyle fills (solid color, gradient) and swap in new
vector SVG content, but it can't pixel-edit a raster image — there's no
"repaint this photo" primitive. For raster images, Pen AI applies a
color/gradient overlay fill instead and says so.

## Project layout

```
manifest.json     Plugin manifest Penpot reads on install
public/icon.svg    Toolbar icon
index.html         The panel's HTML shell
src/plugin.ts       Sandboxed script — runs with the `penpot` global,
                    reads/writes shapes, has no network access
src/ui.ts           Runs inside the panel iframe — normal browser page,
                    calls the Anthropic API, posts results to plugin.ts
src/messages.ts     Shared TypeScript types for the two sides' messages
src/style.css       Panel styling
```

## Build

```bash
npm install
npm run build
```

This produces `dist/` containing `index.html`, the bundled UI JS/CSS,
`plugin.js` (bundled separately with esbuild, since the sandbox needs a
plain script, not an ES module graph), `manifest.json`, and `icon.svg`.

## Run locally & install into Penpot

```bash
npm run serve   # serves dist/ at http://localhost:4400
```

1. Open a file in Penpot (self-hosted needs `enable-plugins-runtime` in
   `PENPOT_FLAGS`; penpot.app cloud has plugins enabled by default).
2. Press `Ctrl+Alt+P` (or Main Menu → Plugins → Manage plugins).
3. Paste `http://localhost:4400/manifest.json` and click **Install**, then
   **Allow** on the permissions prompt, then **Open**.
4. The Pen AI panel opens. Click the ⚙ icon and paste an Anthropic API key
   (from console.anthropic.com) — it's stored via Penpot's plugin
   `localStorage`, scoped to this plugin, and only ever sent directly from
   your browser to `api.anthropic.com`.

## Deploying for real use

Host the built `dist/` folder anywhere that serves static files over HTTPS
(Cloudflare Pages, Vercel, Netlify, GitHub Pages) and install it in Penpot
using that public `manifest.json` URL instead of localhost.

## Extending it

- `src/ui.ts` → `SYSTEM_PROMPT` controls what Claude is allowed to do; add
  more `action` types (e.g. stroke color, opacity, resize) and handle them
  in `applyAction()` + `src/plugin.ts`'s `onMessage` switch.
- Swap the model string in `askPenAi()` if you want a different Claude
  model.
- `@penpot/plugin-types` may add fields between versions — if `npm install`
  pulls a newer version and TypeScript complains in `plugin.ts`, check
  `node_modules/@penpot/plugin-types/index.d.ts` for the current shape of
  `Fill`, `Gradient`, and `localStorage`.
