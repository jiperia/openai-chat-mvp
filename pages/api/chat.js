export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { message } = req.body;

  // Dein OpenAI-Key! Gleich kommt ENV (Schritt unten), erstmal als Platzhalter:
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }]
    })
  });

  if (!response.ok) {
    return res.status(500).json({ error: "OpenAI Fehler" });
  }

  const data = await response.json();
  // Extrahiere Antworttext:
  const answer = data.choices?.[0]?.message?.content || "Keine Antwort";

  res.status(200).json({ answer });
}
