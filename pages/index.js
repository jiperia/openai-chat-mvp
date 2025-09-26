import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([
    { sender: "KI", text: "Hey! Frag mich irgendwas." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Senden + KI-Antwort holen
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // User-Nachricht lokal anzeigen
    setMessages((msgs) => [...msgs, { sender: "Du", text: input }]);
    setLoading(true);

    // POST an deine API!
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ message: input })
    });

    let answer = "Fehler bei KI";
    if (res.ok) {
      const data = await res.json();
      answer = data.answer;
    }

    setMessages((msgs) => [
      ...msgs,
      { sender: "KI", text: answer }
    ]);
    setInput("");
    setLoading(false);
  };

  return (
    <main style={{ margin: "2rem auto", maxWidth: 480 }}>
      <h1>KI-Chat MVP 🚀</h1>
      <div style={{
        background: "#fafafa", borderRadius: 8, padding: 16, minHeight: 200
      }}>
        {messages.map((msg, i) => (
          <div key={i}><b>{msg.sender}:</b> {msg.text}</div>
        ))}
        {loading && <div>Antwort kommt ...</div>}
      </div>
      <form onSubmit={handleSend} style={{ marginTop: 12, display: "flex" }}>
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
