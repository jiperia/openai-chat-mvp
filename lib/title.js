// lib/title.js
// Zweck: Titel aus erster Nachricht erzeugen (Fallback + Smart-API).
// Export: simpleTitleFromText, generateTitleSmart

export function simpleTitleFromText(text, maxWords = 7) {
  if (!text) return 'Neuer Chat';
  let s = String(text)
    .replace(/\s+/g, ' ')
    .replace(/\[[^\]]*\]|\([^\)]*\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim();
  s = s.split(' ').slice(0, maxWords).join(' ').replace(/[.,;:!?-]+$/g, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function generateTitleSmart(firstMessage) {
  try {
    const res = await fetch('/api/generateTitle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt:
          `Erzeuge einen extrem kurzen, prägnanten deutschen Chat-Titel (max. 6 Wörter, keine Anführungszeichen, kein Punkt) aus dieser ersten Nachricht:\n\n"${firstMessage}"`
      })
    });
    if (!res.ok) throw new Error('no 200');
    const { title } = await res.json();
    return (title || '').trim() || simpleTitleFromText(firstMessage);
  } catch {
    return simpleTitleFromText(firstMessage);
  }
}
