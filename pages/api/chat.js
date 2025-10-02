// pages/api/chat.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  try {
    const { history } = await req.json();

    if (
      !Array.isArray(history) ||
      history.length === 0 ||
      typeof history[0]?.content !== 'string' ||
      !history[0]?.content?.trim()
    ) {
      return new Response(JSON.stringify({ error: 'Kontext fehlt oder fehlerhaft: Kein System-Prompt enthalten!' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY fehlt' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: history,
        temperature: 0.2,
        max_tokens: 800
      })
    });

    if (!upstream.ok) {
      const err = await upstream.text().catch(() => '');
      return new Response(JSON.stringify({ error: 'OpenAI Fehler: ' + err }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await upstream.json();
    const answer = data?.choices?.[0]?.message?.content || 'Keine Antwort';

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || 'Unbekannter Fehler' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
