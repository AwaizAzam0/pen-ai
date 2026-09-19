import type { ToPluginMessage, ToUiMessage, SelectedShapeInfo } from './messages';

// This file runs inside Penpot's locked-down plugin sandbox (SES), NOT in
// a normal browser page. It has access to the global `penpot` object but
// not to `fetch`/network APIs with arbitrary origins the way a page would
// — that's why all AI calls happen from the UI iframe (src/ui.ts) instead,
// and this script only ever reads/writes shapes and relays messages.

const STORAGE_KEY = 'pen-ai:anthropic-key';

penpot.ui.open('Pen AI', '/index.html', { width: 340, height: 460 });

function getSelectionInfo(): SelectedShapeInfo[] {
  return penpot.selection.map((shape) => {
    const fills = (shape as any).fills as Array<{ fillColor?: string }> | undefined;
    return {
      id: shape.id,
      name: shape.name,
      type: shape.type,
      fillColor: fills && fills[0] ? fills[0].fillColor : undefined,
    };
  });
}

function sendSelection() {
  const msg: ToUiMessage = { type: 'selection', shapes: getSelectionInfo() };
  penpot.ui.sendMessage(msg);
}

// Fires whenever the user selects/deselects shapes, images or SVGs on canvas.
penpot.on('selectionchange', () => {
  sendSelection();
});

penpot.ui.onMessage((raw: unknown) => {
  const message = raw as ToPluginMessage;

  switch (message.type) {
    case 'get-selection': {
      sendSelection();
      break;
    }

    case 'get-api-key': {
      const key = penpot.localStorage.getItem(STORAGE_KEY) ?? '';
      const msg: ToUiMessage = { type: 'api-key', key };
      penpot.ui.sendMessage(msg);
      break;
    }

    case 'set-api-key': {
      penpot.localStorage.setItem(STORAGE_KEY, message.key);
      break;
    }

    case 'apply-fill': {
      try {
        for (const id of message.shapeIds) {
          const shape = penpot.currentPage?.getShapeById(id);
          if (shape) {
            (shape as any).fills = [{ fillColor: message.fillColor }];
          }
        }
        penpot.ui.sendMessage({ type: 'apply-result', ok: true } satisfies ToUiMessage);
      } catch (err) {
        penpot.ui.sendMessage({
          type: 'apply-result',
          ok: false,
          error: String(err),
        } satisfies ToUiMessage);
      }
      break;
    }

    case 'apply-gradient': {
      try {
        for (const id of message.shapeIds) {
          const shape = penpot.currentPage?.getShapeById(id);
          if (!shape) continue;
          const bounds = (shape as any).boundingBox ?? { x: 0, y: 0, width: 100, height: 100 };
          const { gradient } = message;
          (shape as any).fills = [
            {
              fillColorGradient: {
                type: gradient.gradientType,
                startX: bounds.x,
                startY: bounds.y,
                endX: bounds.x + (bounds.width ?? 100),
                endY: bounds.y + (bounds.height ?? 100),
                width: bounds.width ?? 100,
                stops: gradient.stops.map((s) => ({ color: s.color, offset: s.offset })),
              },
            },
          ];
        }
        penpot.ui.sendMessage({ type: 'apply-result', ok: true } satisfies ToUiMessage);
      } catch (err) {
        penpot.ui.sendMessage({
          type: 'apply-result',
          ok: false,
          error: String(err),
        } satisfies ToUiMessage);
      }
      break;
    }

    case 'insert-svg': {
      try {
        penpot.createShapeFromSvg(message.svg);
        penpot.ui.sendMessage({ type: 'apply-result', ok: true } satisfies ToUiMessage);
      } catch (err) {
        penpot.ui.sendMessage({
          type: 'apply-result',
          ok: false,
          error: String(err),
        } satisfies ToUiMessage);
      }
      break;
    }
  }
});
