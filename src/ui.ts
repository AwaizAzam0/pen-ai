import type { ToPluginMessage, ToUiMessage, SelectedShapeInfo, PenAiAction } from './messages';

// This file runs as an ordinary web page inside the plugin's iframe — it
// has normal `fetch` access, which is why the Anthropic API call lives
// here rather than in plugin.ts (the sandboxed script).

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const els = {
  settingsBtn: $('pa-settings-btn'),
  settings: $('pa-settings'),
  apiKeyInput: $<HTMLInputElement>('pa-api-key'),
  saveKeyBtn: $('pa-save-key'),
  empty: $('pa-empty'),
  selected: $('pa-selected'),
  selectedCount: $('pa-selected-count'),
  selectedName: $('pa-selected-name'),
  trigger: $('pa-trigger'),
  promptSection: $('pa-prompt'),
  promptInput: $<HTMLTextAreaElement>('pa-prompt-input'),
  generateBtn: $<HTMLButtonElement>('pa-generate'),
  cancelBtn: $('pa-cancel'),
  status: $('pa-status'),
  result: $('pa-result'),
  resultNote: $('pa-result-note'),
  againBtn: $('pa-again'),
};

let currentSelection: SelectedShapeInfo[] = [];
let apiKey = '';

function sendToPlugin(message: ToPluginMessage) {
  parent.postMessage(message, '*');
}

function show(el: HTMLElement) { el.classList.remove('hidden'); }
function hide(el: HTMLElement) { el.classList.add('hidden'); }

function renderSelection() {
  if (currentSelection.length === 0) {
    show(els.empty);
    hide(els.selected);
    hide(els.promptSection);
    hide(els.result);
    return;
  }
  hide(els.empty);
  show(els.selected);
  els.selectedCount.textContent = String(currentSelection.length);
  els.selectedName.textContent =
    currentSelection.length === 1 ? currentSelection[0].name : `${currentSelection.length} shapes`;
}

// --- wiring ---

els.settingsBtn.addEventListener('click', () => {
  els.settings.classList.toggle('hidden');
});

els.saveKeyBtn.addEventListener('click', () => {
  apiKey = els.apiKeyInput.value.trim();
  sendToPlugin({ type: 'set-api-key', key: apiKey });
  hide(els.settings);
});

els.trigger.addEventListener('click', () => {
  hide(els.selected);
  show(els.promptSection);
  els.promptInput.focus();
});

els.cancelBtn.addEventListener('click', () => {
  hide(els.promptSection);
  show(els.selected);
});

els.againBtn.addEventListener('click', () => {
  hide(els.result);
  show(els.selected);
});

els.generateBtn.addEventListener('click', async () => {
  const prompt = els.promptInput.value.trim();
  if (!prompt) return;

  if (!apiKey) {
    els.status.textContent = 'Add your Anthropic API key in ⚙ settings first.';
    show(els.settings);
    return;
  }

  els.generateBtn.disabled = true;
  els.status.textContent = 'Thinking…';

  try {
    const action = await askPenAi(prompt, currentSelection);
    applyAction(action);
    els.status.textContent = '';
    hide(els.promptSection);
    show(els.result);
    els.resultNote.textContent = action.note;
  } catch (err) {
    els.status.textContent = `Error: ${(err as Error).message}`;
  } finally {
    els.generateBtn.disabled = false;
  }
});

function applyAction(action: PenAiAction) {
  const shapeIds = currentSelection.map((s) => s.id);
  if (action.action === 'recolor' && action.fillColor) {
    sendToPlugin({ type: 'apply-fill', shapeIds, fillColor: action.fillColor });
  } else if (action.action === 'gradient' && action.gradient) {
    sendToPlugin({
      type: 'apply-gradient',
      shapeIds,
      gradient: { gradientType: action.gradient.type, stops: action.gradient.stops },
    });
  } else if (action.action === 'insert-icon' && action.svg) {
    sendToPlugin({ type: 'insert-svg', svg: action.svg });
  }
}

// --- Claude call ---

const SYSTEM_PROMPT = `You are Pen AI, a design assistant embedded in Penpot.
The user has one or more shapes selected and gives you a natural-language
instruction. Decide the single best action and reply with ONLY raw JSON
(no markdown fences, no commentary) matching exactly this shape:

{
  "action": "recolor" | "gradient" | "insert-icon" | "none",
  "fillColor": "#RRGGBB",                // only for "recolor"
  "gradient": {                          // only for "gradient"
    "type": "linear" | "radial",
    "stops": [{ "color": "#RRGGBB", "offset": 0 }, { "color": "#RRGGBB", "offset": 1 }]
  },
  "svg": "<svg ...>...</svg>",           // only for "insert-icon": a small,
                                          // simple, ORIGINAL flat-style SVG
                                          // icon (no copyrighted characters
                                          // or real logos), viewBox 0 0 64 64
  "note": "one short sentence describing what you did"
}

Rules:
- Use "recolor" for solid-color requests.
- Use "gradient" for anything mentioning gradient, sunset, fade, blend, multiple colors.
- Use "insert-icon" only when the user asks to generate/replace with a new icon or graphic.
- Raster images (type "image") can only be recolored/gradient-filled as an overlay tint, not pixel-edited — pick the closest of the three actions and say so in "note".
- Always return valid strict JSON, nothing else.`;

async function askPenAi(prompt: string, selection: SelectedShapeInfo[]): Promise<PenAiAction> {
  const context = selection
    .map((s) => `- ${s.name} (type: ${s.type}${s.fillColor ? `, current fill: ${s.fillColor}` : ''})`)
    .join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Required for calling the API directly from a browser context.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Selected shapes:\n${context}\n\nInstruction: ${prompt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = (data.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();

  const cleaned = text.replace(/^```json\s*|^```\s*|```$/g, '').trim();
  return JSON.parse(cleaned) as PenAiAction;
}

// --- messages from plugin.ts ---

window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data as ToUiMessage;
  if (!message || typeof message !== 'object') return;

  switch (message.type) {
    case 'selection':
      currentSelection = message.shapes;
      renderSelection();
      break;
    case 'api-key':
      apiKey = message.key;
      els.apiKeyInput.value = apiKey;
      break;
    case 'apply-result':
      if (!message.ok) {
        els.status.textContent = `Couldn't apply change: ${message.error ?? 'unknown error'}`;
      }
      break;
  }
});

sendToPlugin({ type: 'get-selection' });
sendToPlugin({ type: 'get-api-key' });
renderSelection();
