import { useState, useRef, useEffect } from 'react';

export default function Home() {
  // Archiv: Array aus Chat-Objekten {id, title, messages: []}
  const [chats, setChats] = useState([
    { id: 1, title: "Chat #1", messages: [] }
  ]);
  const [activeChatId, setActiveChatId] = useState(1);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const SYSTEM_PROMPT = "Du bist ein freundlicher, deutschsprachiger KI-Chatassistent.";

  // Aktueller Chat aus Archiv
  const activeChat = chats.find(c => c.id === activeChatId);

  // Scrolle immer ans Ende des Chats
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, loading]);

  // Chat archivieren: Neuen anlegen
  const handleNewChat = () => {
    const nextId = chats.length > 0 ? Math.max(...chats.map(c => c.id)) + 1 : 1;
    setChats([...chats, { id: nextId, title: `Chat #${nextId}`, messages: [] }]);
    setActiveChatId(nextId);
    setInput("");
  };

  // Message senden (nur im aktiven Chat)
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { sender: "Du", text: input };
    const newMessages = [...activeChat.messages, userMsg];

    // OpenAI-Kontext inkl. System-Prompt + Verlauf
    const openaiHistory = [
      { role: "system", content: SYSTEM_PROMPT },
      ...newMessages.filter(msg => msg.text && msg.text.trim() !== "")
        .map(msg =>
          msg.sender === "Du"
            ? { role: "user", content: msg.text }
            : { role: "assistant", content: msg.text }
        )
    ];

    setLoading(true);
    setChats(chats =>
      chats.map(chat =>
        chat.id === activeChatId
          ? { ...chat, messages: newMessages }
          : chat
      )
    );
    setInput("");

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

    // KI-Antwort dranhängen
    setChats(chats =>
      chats.map(chat =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, { sender: "KI", text: answer }] }
          : chat
      )
    );
    setLoading(false);
  };

  // Chat design helpers
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

  // Sidebar design
  const sidebarStyle = {
    width: 180,
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc, #e8eef7 90%)",
    borderRight: "1.5px solid #e0e6ef",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "20px 10px 10px 18px",
    gap: 15,
    position: "fixed",
    left: 0,
    top: 0,
    zIndex: 10
  };

  const chatBtnStyle = id => ({
    background: id === activeChatId ? "#2f80ed" : "#fff",
    color: id === activeChatId ? "#fff" : "#336",
    border: "none",
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: 700,
    textAlign: "left",
    width: "150px",
    marginBottom: 5,
    cursor: "pointer",
    opacity: id === activeChatId ? 1 : 0.8
  });

  return (
    <div style={{ display: "flex" }}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={{
          fontWeight: 800, fontSize: "1.1em", color: "#2f80ed", marginBottom: 9
        }}>
          Chats
        </div>
        {chats.map(chat => (
          <button
            key={chat.id}
            style={chatBtnStyle(chat.id)}
            onClick={() => setActiveChatId(chat.id)}
          >
            {chat.title}
          </button>
        ))}
        <button
          style={{
            marginTop: 15,
            background: "#f2f3f5", color: "#2f80ed",
            border: "none", padding: "10px 18px", borderRadius: "12px",
            fontWeight: 700, fontSize: "0.9em", cursor: "pointer", opacity: 0.96
          }}
          onClick={handleNewChat}
        >
          + Neuer Chat
        </button>
      </aside>

      {/* Main Chat window */}
      <main style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e4ecfb 0%, #f8fafc 50%, #f3f7fa 100%)",
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        marginLeft: 180
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
            {(activeChat?.messages.length === 0 && !loading) &&
              <div style={{
                color: "#90a4b8",
                textAlign: "center",
                marginTop: "35%"
              }}>Frag mich irgendwas …</div>
            }
            {activeChat?.messages.map((msg, i) => (
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
    </div>
  );
}
