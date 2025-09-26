import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll immer ans Ende, wenn neue Message kommt
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const SYSTEM_PROMPT = "Du bist ein freundlicher, deutschsprachiger KI-Chatassistent.";

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { sender: "Du", text: input };
    if (!userMsg.text || userMsg.text.trim() === "") return;

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const openaiHistory = [
      { role: "system", content: SYSTEM_PROMPT },
      ...newMessages
        .filter(msg => msg.text && msg.text.trim() !== "")
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

  // Farben und Chatblasen-Design
  const bubbleStyle = sender => ({
    maxWidth: "70%",
    padding: "12px 16px",
    borderRadius: 18,
    margin: "4px 0",
    background: sender === "Du" ? "#2f80ed" : "#f2f3f5",
    color: sender === "Du" ? "#fff" : "#222",
    alignSelf: sender === "Du" ? "flex-end" : "flex-start",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
  });

  const wrapperStyle = {
    minHeight: 400,
    background: "linear-gradient(135deg, #f8fafc 40%, #e5e9f2 100%)",
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    boxShadow: "0 2px 18px rgba(44,62,80,0.07)",
    display: "flex",
    flexDirection: "column"
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #e4ecfb 0%, #f8fafc 50%, #f3f7fa 100%)",
      display: "flex", flexDirection: "column", alignItems: "center"
    }}>
      <div style={{ width: "100%", maxWidth: 460, margin: "38px auto 0" }}>
        <h1 style={{
          textAlign: "center",
          color: "#2f80ed",
          fontWeight: 900,
          letterSpacing: "0.04em"
        }}>
          💬 KI-Chat MVP
        </h1>
        <div style={wrapperStyle}>
          {messages.length === 0 && !loading &&
            <div style={{
              color: "#90a4b8",
              textAlign: "center",
              marginTop: "35%"
            }}>Frag mich irgendwas …</div>
          }
          {messages.map((msg, i) => (
            <div key={i} style={bubbleStyle(msg.sender)}>
              <span style={{
                fontWeight: 700,
                fontSize: "0.88em",
                color: msg.sender === "Du" ? "#e7f0fd" : "#888"
              }}>{msg.sender}:</span>
              <span style={{ marginLeft: 6 }}>{msg.text}</span>
            </div>
          ))}
          {loading &&
            <div style={{
              ...bubbleStyle("KI"), fontStyle: "italic",
              color: "#999"
            }}>Antwort kommt …</div>
          }
          <div ref={chatEndRef}></div>
        </div>
        <form onSubmit={handleSend} style={{
          display: "flex", gap: 8, marginTop: 8
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Deine Nachricht …"
            style={{
              flex: 1,
              padding: "13px 16px",
              borderRadius: 12,
              border: "1.5px solid #c5cfed",
              background: "#fff",
              fontSize: "1em",
              outline: "none"
            }}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()} style={{
            background: "#2f80ed",
            color: "#fff",
            border: "none",
            padding: "13px 25px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: "1em",
            letterSpacing: "0.01em",
            boxShadow: loading ? "none" : "0 2px 6px rgba(47,128,237,0.06)",
            opacity: loading || !input.trim() ? 0.65 : 1,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            transition: "all 0.2s"
          }}>Senden</button>
        </form>
      </div>
    </main>
  );
}
