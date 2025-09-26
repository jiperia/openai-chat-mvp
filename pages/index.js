import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Systemprompt bleibt als Einstieg immer bestehen!
  const SYSTEM_PROMPT = "Du bist ein freundlicher, deutschsprachiger KI-Chatassistent.";

  const handleSend = async (e) => {
    e.preventDefault();
    // Schutz: Kein leerer Text, kein Doppel-Click!
    if (!input.trim() || loading) return;

    // Neue Usernachricht
    const userMsg = { sender: "Du", text: input };
    // Falls text doch leer ist: Schutz
    if (!userMsg.text || userMsg.text.trim() === "") return;

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // OpenAI-Kontext: Systemprompt + Nachrichten (keine leeren Texte!)
    const openaiHistory = [
      { role: "system", content: SYSTEM_PROMPT },
      ...newMessages
        .filter(msg => msg.text && msg.text.trim() !== "") // FILTER
        .map(msg =>
          msg.sender === "Du"
            ? { role: "user", content: msg.text }
            : { role: "assistant", content: msg.text }
        )
    ];

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: openaiHistory })
    });

    let answer = "Fehler bei KI";
    if (res.ok) {
      const data = await res.json();
      answer = data.answer;
    } else if (res.headers.get("content-type")?.includes("application/json")) {
      const data = await res.json();
      answer = data.error || "Fehler bei KI";
    } else {
      answer = await res.text();
    }

    setMessages(msgs => [...msgs, { sender: "KI", text: answer }]);
    setLoading(false);
  };

  return (
    <main style={{ margin: "2rem auto", maxWidth: 480 }}>
      <h1>KI-Chat MVP 🚀</h1>
      <div style={{
        background: "#fafafa", borderRadius: 8, padding: 16, minHeight: 200, marginBottom: 16
      }}>
        {messages.length === 0 && !loading &&
          <div style={{ color: "#888" }}>Frag mich irgendwas ...</div>
        }
        {messages.map((msg, i) => (
          <div key={i}><b>{msg.sender}:</b> {msg.text}</div>
        ))}
        {loading && <div>Antwort kommt ...</div>}
      </div>
      <form onSubmit={handleSend} style={{ display: "flex" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Deine Nachricht..."
          style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          disabled={loading}
        />
        <button style={{
          marginLeft: 8, padding: "8px 16px", borderRadius: 4, background: "#222", color: "#fff"
        }} disabled={loading}>Senden</button>
      </form>
    </main>
  )
}
