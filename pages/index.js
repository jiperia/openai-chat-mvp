import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([
    { sender: "KI", text: "Hey! Frag mich irgendwas." }
  ]);
  const [input, setInput] = useState("");

  // (Logik zum Senden bauen wir im nächsten Schritt!)
  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { sender: "Du", text: input }]);
    setInput("");
    // Hier später: KI-Aufruf und Antwort anhängen!
  }

  return (
    <main style={{ margin: "2rem auto", maxWidth: 480 }}>
      <h1>KI-Chat MVP 🚀</h1>
      <div style={{
        background: "#fafafa", borderRadius: 8, padding: 16, minHeight: 200
      }}>
        {messages.map((msg, i) => (
          <div key={i}><b>{msg.sender}:</b> {msg.text}</div>
        ))}
      </div>
      <form onSubmit={handleSend} style={{ marginTop: 12, display: "flex" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Deine Nachricht..."
          style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button style={{
          marginLeft: 8, padding: "8px 16px", borderRadius: 4, background: "#222", color: "#fff"
        }}>Senden</button>
      </form>
    </main>
  )
}
