// netlify/functions/openai-proxy.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return { statusCode: 500, headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ error: 'Server Configuration Error' }) };
  }

  const qs = event.queryStringParameters || {};
  const openaiPath = qs.path; // e.g., 'chat/completions'
  if (!openaiPath) {
    return { statusCode: 400, headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ error: 'Missing path query (e.g., chat/completions)' }) };
  }

  let requestBody;
  try { requestBody = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ error: 'Invalid JSON in request body' }) }; }

  try {
    const r = await fetch(`https://api.openai.com/v1/${openaiPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify(requestBody)
    });
    const text = await r.text();
    // Try to pass through JSON; if not JSON, wrap it so frontend can show the server message.
    try {
      const json = JSON.parse(text);
      return { statusCode: r.status, headers:{'Content-Type':'application/json'}, body: JSON.stringify(json) };
    } catch {
      return { statusCode: r.status, headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ error: 'OpenAI non-JSON', raw: text.slice(0,500) }) };
    }
  } catch (e) {
    return { statusCode: 500, headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ error: 'Proxy failure', message: String(e) }) };
  }
};