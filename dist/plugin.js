"use strict";
(() => {
  // src/plugin.ts
  var STORAGE_KEY = "pen-ai:anthropic-key";
  penpot.ui.open("Pen AI", "/index.html", { width: 340, height: 460 });
  function getSelectionInfo() {
    return penpot.selection.map((shape) => {
      const fills = shape.fills;
      return {
        id: shape.id,
        name: shape.name,
        type: shape.type,
        fillColor: fills && fills[0] ? fills[0].fillColor : void 0
      };
    });
  }
  function sendSelection() {
    const msg = { type: "selection", shapes: getSelectionInfo() };
    penpot.ui.sendMessage(msg);
  }
  penpot.on("selectionchange", () => {
    sendSelection();
  });
  penpot.ui.onMessage((raw) => {
    const message = raw;
    switch (message.type) {
      case "get-selection": {
        sendSelection();
        break;
      }
      case "get-api-key": {
        const key = penpot.localStorage.getItem(STORAGE_KEY) ?? "";
        const msg = { type: "api-key", key };
        penpot.ui.sendMessage(msg);
        break;
      }
      case "set-api-key": {
        penpot.localStorage.setItem(STORAGE_KEY, message.key);
        break;
      }
      case "apply-fill": {
        try {
          for (const id of message.shapeIds) {
            const shape = penpot.currentPage?.getShapeById(id);
            if (shape) {
              shape.fills = [{ fillColor: message.fillColor }];
            }
          }
          penpot.ui.sendMessage({ type: "apply-result", ok: true });
        } catch (err) {
          penpot.ui.sendMessage({
            type: "apply-result",
            ok: false,
            error: String(err)
          });
        }
        break;
      }
      case "apply-gradient": {
        try {
          for (const id of message.shapeIds) {
            const shape = penpot.currentPage?.getShapeById(id);
            if (!shape) continue;
            const bounds = shape.boundingBox ?? { x: 0, y: 0, width: 100, height: 100 };
            const { gradient } = message;
            shape.fills = [
              {
                fillColorGradient: {
                  type: gradient.gradientType,
                  startX: bounds.x,
                  startY: bounds.y,
                  endX: bounds.x + (bounds.width ?? 100),
                  endY: bounds.y + (bounds.height ?? 100),
                  width: bounds.width ?? 100,
                  stops: gradient.stops.map((s) => ({ color: s.color, offset: s.offset }))
                }
              }
            ];
          }
          penpot.ui.sendMessage({ type: "apply-result", ok: true });
        } catch (err) {
          penpot.ui.sendMessage({
            type: "apply-result",
            ok: false,
            error: String(err)
          });
        }
        break;
      }
      case "insert-svg": {
        try {
          penpot.createShapeFromSvg(message.svg);
          penpot.ui.sendMessage({ type: "apply-result", ok: true });
        } catch (err) {
          penpot.ui.sendMessage({
            type: "apply-result",
            ok: false,
            error: String(err)
          });
        }
        break;
      }
    }
  });
})();
