# Beauty-Base: Netlify + GitHub quick setup

## Files included
- `netlify/functions/openai-proxy.js` — serverless proxy that forwards to OpenAI (uses built‑in `fetch`).
- `netlify.toml` — tells Netlify where the functions live.
- `client-oai.js` — tiny front-end helper for calling the proxy and (optionally) sending images.

## How to use (browser-only)
1. Create a new GitHub repo and upload your project, **including these files** in the exact paths shown above.
2. On Netlify: **Add new site → Import from Git → GitHub → your repo.**
3. In Netlify **Site settings → Environment variables**, add:
   - `OPENAI_API_KEY` = your real key
4. Deploy. After deploy:
   - Open `https://<yoursite>.netlify.app/.netlify/functions/openai-proxy` → should show `{"error":"Method Not Allowed"}`.
   - In your page Console, run the quick POST test from the instructions we discussed.

## Front-end usage
```html
<script type="module">
  import { createOpenAIClient } from './client-oai.js';
  const oai = createOpenAIClient();
  async function go() {
    const res = await oai.chat([{ role:'user', content:[{type:'text', text:'ping'}] }]);
    console.log(res.text, res.json, res.raw);
  }
  go();
</script>
```

For images, build your `content` with `await oai.filesToImageParts(input.files)` and include alongside text in the same user message.