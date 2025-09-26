export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { history } = req.body; // history = [{role, content}, ...]

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
