// pages/api/generateTitle.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { prompt } = req.body || {};
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "Kein Prompt übergeben" });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY fehlt in ENV" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // gerne auch gpt-3.5-turbo, je nach Plan
        messages: [
          {
            role: "system",
            content:
              "Du bist ein Titelgenerator. Fasse die erste User-Nachricht in einem sehr kurzen, prägnanten deutschen Chat-Titel zusammen. Max. 6 Wörter, keine Satzzeichen, keine Anführungszeichen."
          },
          { role: "user", content: prompt.slice(0, 2000) }
        ],
        temperature: 0.2,
        max_tokens: 24
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: "OpenAI Fehler: " + err });
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || "";

    // Cleanup
    title = title
      .replace(/^["'„“‚‘]+|["'„“‚‘]+$/g, "")
      .replace(/[.!?…]+$/g, "")
      .split(/\s+/)
      .slice(0, 6)
      .join(" ");

    res.status(200).json({ title });
  } catch (e) {
    res.status(500).json({ error: e.message || "Unbekannter Fehler" });
  }
}
