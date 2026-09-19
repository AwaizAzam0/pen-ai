(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))c(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const y of o.addedNodes)y.tagName==="LINK"&&y.rel==="modulepreload"&&c(y)}).observe(document,{childList:!0,subtree:!0});function g(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function c(r){if(r.ep)return;r.ep=!0;const o=g(r);fetch(r.href,o)}})();const s=t=>document.getElementById(t),e={settingsBtn:s("pa-settings-btn"),settings:s("pa-settings"),apiKeyInput:s("pa-api-key"),saveKeyBtn:s("pa-save-key"),empty:s("pa-empty"),selected:s("pa-selected"),selectedCount:s("pa-selected-count"),selectedName:s("pa-selected-name"),trigger:s("pa-trigger"),promptSection:s("pa-prompt"),promptInput:s("pa-prompt-input"),generateBtn:s("pa-generate"),cancelBtn:s("pa-cancel"),status:s("pa-status"),result:s("pa-result"),resultNote:s("pa-result-note"),againBtn:s("pa-again")};let l=[],u="";function d(t){parent.postMessage(t,"*")}function p(t){t.classList.remove("hidden")}function a(t){t.classList.add("hidden")}function f(){if(l.length===0){p(e.empty),a(e.selected),a(e.promptSection),a(e.result);return}a(e.empty),p(e.selected),e.selectedCount.textContent=String(l.length),e.selectedName.textContent=l.length===1?l[0].name:`${l.length} shapes`}e.settingsBtn.addEventListener("click",()=>{e.settings.classList.toggle("hidden")});e.saveKeyBtn.addEventListener("click",()=>{u=e.apiKeyInput.value.trim(),d({type:"set-api-key",key:u}),a(e.settings)});e.trigger.addEventListener("click",()=>{a(e.selected),p(e.promptSection),e.promptInput.focus()});e.cancelBtn.addEventListener("click",()=>{a(e.promptSection),p(e.selected)});e.againBtn.addEventListener("click",()=>{a(e.result),p(e.selected)});e.generateBtn.addEventListener("click",async()=>{const t=e.promptInput.value.trim();if(t){if(!u){e.status.textContent="Add your Anthropic API key in ⚙ settings first.",p(e.settings);return}e.generateBtn.disabled=!0,e.status.textContent="Thinking…";try{const n=await v(t,l);m(n),e.status.textContent="",a(e.promptSection),p(e.result),e.resultNote.textContent=n.note}catch(n){e.status.textContent=`Error: ${n.message}`}finally{e.generateBtn.disabled=!1}}});function m(t){const n=l.map(g=>g.id);t.action==="recolor"&&t.fillColor?d({type:"apply-fill",shapeIds:n,fillColor:t.fillColor}):t.action==="gradient"&&t.gradient?d({type:"apply-gradient",shapeIds:n,gradient:{gradientType:t.gradient.type,stops:t.gradient.stops}}):t.action==="insert-icon"&&t.svg&&d({type:"insert-svg",svg:t.svg})}const h=`You are Pen AI, a design assistant embedded in Penpot.
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
- Always return valid strict JSON, nothing else.`;async function v(t,n){const g=n.map(i=>`- ${i.name} (type: ${i.type}${i.fillColor?`, current fill: ${i.fillColor}`:""})`).join(`
`),c=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":u,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1500,system:h,messages:[{role:"user",content:`Selected shapes:
${g}

Instruction: ${t}`}]})});if(!c.ok){const i=await c.text();throw new Error(`API ${c.status}: ${i.slice(0,200)}`)}const y=((await c.json()).content??[]).filter(i=>i.type==="text").map(i=>i.text).join(`
`).trim().replace(/^```json\s*|^```\s*|```$/g,"").trim();return JSON.parse(y)}window.addEventListener("message",t=>{const n=t.data;if(!(!n||typeof n!="object"))switch(n.type){case"selection":l=n.shapes,f();break;case"api-key":u=n.key,e.apiKeyInput.value=u;break;case"apply-result":n.ok||(e.status.textContent=`Couldn't apply change: ${n.error??"unknown error"}`);break}});d({type:"get-selection"});d({type:"get-api-key"});f();
