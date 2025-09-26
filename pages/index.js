import { useState } from 'react';

export default function Home() {
  // Starte mit einem leeren Chatverlauf!
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // System-Prompt (bleibt beim KI-Verlauf als Kontext vorne)
  const SYSTEM_PROMPT = "Du bist ein freundlicher, deutschsprachiger KI-Chatassistent.";

  // Handler für Senden
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Neue Usernachricht an Chat anhängen
    const newMessages = [...messages, { sender: "Du", text: input }];
    setMessages(newMessages);
    setLoading(true);

    // Historie für OpenAI zusammenbauen (mit system prompt)
    const openaiHistory = [
      { role: "system", content: SYSTEM_PROMPT },
      ...newMessages.map(msg =>
        msg.sender === "Du"
          ? { role: "user", content: msg.text }
          : { role: "assistant", content: msg.text }
      )
    ];

    // API-Request (an eigene API-Route)
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
    setInput("");
    setLoading(false);
  };

  return (
    <main style={{ margin: "2rem auto", maxWidth: 480 }}>
      <h1>KI-Chat MVP 🚀</h1>
      <div style={{
        background: "#fafafa", borderRadius: 8, padding: 16, minHeight: 200, marginBottom: 16
      }}>
        {messages.map((msg, i) => (
          <div key={i}><b>{msg.sender}:</b> {msg.text}</div>
        ))}
        {loading && <div>Antwort kommt ...</div>}
        {messages.length === 0 && !loading &&
          <div style={{ color: "#888" }}>Frag mich irgendwas ...</div>
        }
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
