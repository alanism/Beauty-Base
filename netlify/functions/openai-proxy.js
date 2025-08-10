// netlify/functions/openai-proxy.js
// Secure proxy to OpenAI. Uses built‑in fetch (Node 18+ on Netlify).
// Requires env var OPENAI_API_KEY set in Netlify site settings.

exports.handler = async (event) => {
  const json = (code, obj) => ({
    statusCode: code,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  });

  try {
    if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return json(500, { error: "Server Configuration Error" });

    const qs = event.queryStringParameters || {};
    const openaiPath = qs.path; // e.g. chat/completions
    if (!openaiPath) return json(400, { error: "Missing path query (e.g., chat/completions)" });

    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { return json(400, { error: "Invalid JSON in request body" }); }

    const resp = await fetch(`https://api.openai.com/v1/${openaiPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    // Try to pass through JSON; if not JSON, wrap the raw text for debugging.
    try {
      const parsed = JSON.parse(text);
      return json(resp.status, parsed);
    } catch {
      return json(resp.status, { error: "OpenAI non-JSON", raw: text.slice(0, 1000) });
    }
  } catch (e) {
    return json(500, { error: "Proxy failure", message: String(e) });
  }
};