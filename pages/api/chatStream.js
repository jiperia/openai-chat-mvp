export const config = { runtime: 'edge' }; // Edge = schneller in Vercel

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  const { history } = await req.json();
  if (!Array.isArray(history) || history.length === 0) {
    return new Response(JSON.stringify({ error: 'history fehlt' }), { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'OPENAI_API_KEY fehlt' }), { status: 500 });

  // Stream von OpenAI weiterreichen (Server-Sent-Stream)
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: history,
      temperature: 0.2,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text().catch(() => '');
    return new Response(JSON.stringify({ error: `OpenAI Fehler: ${txt}` }), { status: 500 });
  }

  // Direktes Durchreichen der Stream-Bytes
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
    },
  });
}
