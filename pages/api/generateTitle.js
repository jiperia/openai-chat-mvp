// pages/api/generateTitle.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || !prompt.trim()) {
      return new Response(JSON.stringify({ error: 'Kein Prompt übergeben' }), {
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

    const system = `Du erzeugst aus der ersten Chat-Nachricht einen sehr kurzen, prägnanten deutschen Titel.
- Max. 6 Wörter
- Keine Anführungszeichen, kein Punkt, keine Emojis
- Keine Höflichkeitsfloskeln
Nur den Titel ausgeben.`;

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: String(prompt).slice(0, 2000) }
        ],
        temperature: 0.2,
        max_tokens: 24
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
    let title = data?.choices?.[0]?.message?.content || '';

    // Sanitize & kürzen
    title = (title || '')
      .replace(/^["'„“‚‘]+|["'„“‚‘]+$/g, '')
      .replace(/[.!?…]+$/g, '')
      .replace(/[^\p{L}\p{N}\p{Z}\-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .slice(0, 6)
      .join(' ');

    return new Response(JSON.stringify({ title }), {
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
