// client-oai.js
// Minimal client helper for your pages.
// Usage:
//   const oai = createOpenAIClient();
//   const res = await oai.chat([{role:'user', content:[{type:'text', text:'ping'}]}]);
//   console.log(res.text);
//
export function createOpenAIClient(opts = {}) {
  const endpoint = opts.endpoint || '/.netlify/functions/openai-proxy?path=chat/completions';
  const defaultModel = opts.model || 'gpt-4o-mini';

  async function chat(messages, options = {}) {
    const payload = {
      model: options.model || defaultModel,
      messages,
      response_format: options.response_format || { type: 'json_object' },
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens ?? 2000
    };

    // First attempt
    let r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    let raw = await r.json();

    // Fallback if OpenAI returns an error object
    if (!r.ok || raw?.error) {
      console.warn('Primary model error:', raw?.error || r.status);
      payload.model = options.fallback_model || 'gpt-4o';
      r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      raw = await r.json();
      if (!r.ok || raw?.error) {
        throw new Error(raw?.error?.message || `OpenAI error ${r.status}`);
      }
    }

    const text = raw?.choices?.[0]?.message?.content ?? '';
    let json = null;
    try { json = JSON.parse(text); } catch(_) {}
    return { raw, text, json, model: payload.model };
  }

  // Utility: turn File object(s) into image parts for the chat content
  async function filesToImageParts(files, { maxW = 1024, mime = 'image/jpeg', quality = 0.85 } = {}) {
    const items = Array.from(files || []);
    const out = [];
    for (const f of items) {
      const b64 = await resizeAndToBase64(f, { maxW, mime, quality });
      out.push({ type: 'input_image', image_url: { url: `data:${mime};base64,${b64}` } });
    }
    return out;
  }

  // Resize image client-side to keep requests small
  function resizeAndToBase64(file, { maxW = 1024, mime = 'image/jpeg', quality = 0.85 } = {}) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(async (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result || '').toString().split(',')[1] || '';
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }, mime, quality);
      };
      img.onerror = reject;
      const fr = new FileReader();
      fr.onload = () => { img.src = fr.result; };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  return { chat, filesToImageParts };
}