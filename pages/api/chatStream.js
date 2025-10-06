// pages/api/chatStream.js
// Zweck: Stabiler Streaming-Proxy zu OpenAI Chat Completions (SSE).
// Fixes: Niedrige Temperatur, gutes Modell (gpt-4o-mini), sauberes SSE-Relaying,
//        Fallback-Systemprompt auf Deutsch, Validierungen.

export const config = {
  api: {
    bodyParser: true,
  },
};

const DEFAULT_SYSTEM = 'Du bist ein hilfsbereiter, klar formulierender, deutschsprachiger KI-Assistent. Antworte präzise, freundlich und in korrekter deutscher Grammatik.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { history } = req.body || {};
  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'history fehlt oder ist kein Array' });
  }

  // History säubern (keine leeren Assistant-Messages)
  const cleaned = history
    .filter(Boolean)
    .map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : String(m.content || ''),
    }))
    .filter(m => m.content.trim() !== '');

  // System vorn sicherstellen
  const hasSystem = cleaned[0]?.role === 'system';
  if (!hasSystem) cleaned.unshift({ role: 'system', content: DEFAULT_SYSTEM });

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY nicht gesetzt' });
  }

  try {
    // OpenAI Chat Completions mit Stream
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: cleaned,
        temperature: 0.2,
        top_p: 1,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => '');
      return res.status(500).json({ error: `OpenAI-Fehler: ${txt || upstream.status}` });
    }

    // SSE-Header an Client
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Für Vercel/Next: Flush sofort
    res.flushHeaders?.();

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf-8');

    // Stream -> direkt weiterreichen
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      // Wir erwarten bereits „data: …“-Zeilen von OpenAI; zur Sicherheit normalisieren:
      for (const line of chunk.split('\n')) {
        const l = line.trim();
        if (!l) continue;
        if (l.startsWith('data:')) {
          res.write(l + '\n');
        } else {
          // fallback: verpacken
          res.write('data: ' + l + '\n');
        }
      }
    }

    // Abschluss
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e) {
    try {
      res.write(`data: ${JSON.stringify({ error: String(e?.message || e) })}\n\n`);
    } catch {}
    res.end();
  }
}
