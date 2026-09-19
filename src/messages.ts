// Message contract shared between the UI iframe (src/ui.ts) and the
// sandboxed plugin script (src/plugin.ts). They can't share a JS module
// at runtime (different execution contexts) but keeping the shapes here
// keeps both sides honest when you edit one.

export interface SelectedShapeInfo {
  id: string;
  name: string;
  type: string;
  fillColor?: string;
}

export type ToUiMessage =
  | { type: 'selection'; shapes: SelectedShapeInfo[] }
  | { type: 'api-key'; key: string }
  | { type: 'apply-result'; ok: boolean; error?: string };

export type ToPluginMessage =
  | { type: 'get-selection' }
  | { type: 'get-api-key' }
  | { type: 'set-api-key'; key: string }
  | { type: 'apply-fill'; shapeIds: string[]; fillColor: string }
  | {
      type: 'apply-gradient';
      shapeIds: string[];
      gradient: {
        gradientType: 'linear' | 'radial';
        stops: { color: string; offset: number }[];
      };
    }
  | { type: 'insert-svg'; svg: string };

// The JSON shape we ask Claude to return for every prompt.
export interface PenAiAction {
  action: 'recolor' | 'gradient' | 'insert-icon' | 'none';
  fillColor?: string;
  gradient?: {
    type: 'linear' | 'radial';
    stops: { color: string; offset: number }[];
  };
  svg?: string;
  note: string;
}
