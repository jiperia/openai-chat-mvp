export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Hier muss "history" von vornherein auf einen sinnvollen Default gesetzt sein!
  const { history } = req.body;

  if (
    !Array.isArray(history) ||
    history.length === 0 ||
    typeof history[0].content !== "string" ||
    !history[0].content.trim()
  ) {
    return res.status(400).json({ error: "Kontext fehlt oder fehlerhaft: Kein System-Prompt enthalten!" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: history
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    return res.status(500).json({ error: "OpenAI Fehler: " + errorData });
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content || "Keine Antwort";

  res.status(200).json({ answer });
}
