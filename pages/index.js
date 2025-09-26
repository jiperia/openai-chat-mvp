import { useState, useRef, useEffect } from 'react';
import { supabase } from "./supabaseClient"; // Importiere deinen Supabase-Client!

export default function Home() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const chatEndRef = useRef(null);

  const SYSTEM_PROMPT = "Du bist ein freundlicher, deutschsprachiger KI-Chatassistent.";

  // On mount: Chats aus Supabase laden
  useEffect(() => {
    async function fetchChats() {
      setIsLoadingChats(true);
      let { data, error } = await supabase
        .from("chats")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data) {
        setChats(data);
        if (data.length > 0) setActiveChatId(data[0].id);
      }
      setIsLoadingChats(false);
    }
    fetchChats();
  }, []);

  // Automatisch ans Ende scrollen, wenn sich Chat ändert
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatId, chats, loading]);

  // Chat anlegen in Cloud
  const handleNewChat = async () => {
    const chatTitle = `Chat #${chats.length + 1}`;
    const { data, error } = await supabase
      .from("chats")
      .insert([{ title: chatTitle, messages: [] }])
      .select()
      .single();

    if (!error && data) {
      setChats(chs => [...chs, data]);
      setActiveChatId(data.id);
      setInput("");
    }
  };

  // Message senden und in Cloud speichern
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeChatId) return;

    const userMsg = { sender: "Du", text: input };
    const currentChat = chats.find(c => c.id === activeChatId);
    const newMessages = [...(currentChat?.messages || []), userMsg];

    // KI-Kontext
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

    setLoading(true);
    // Schreibe Usernachricht rein (so fühlt es sich sofort responsiv an)
    setChats(chs =>
      chs.map(chat =>
        chat.id === activeChatId
          ? { ...chat, messages: newMessages }
          : chat
      )
    );
    setInput("");

    // KI-Request
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

    // Speichere KI-Antwort direkt in DB und im State
    const updatedMessages = [...newMessages, { sender: "KI", text: answer }];
    const { data: updatedChat, error } = await supabase
      .from("chats")
      .update({ messages: updatedMessages })
      .eq("id", activeChatId)
      .select()
      .single();

    if (!error && updatedChat) {
      setChats(chs =>
        chs.map(chat =>
          chat.id === activeChatId
            ? { ...chat, messages: updatedMessages }
            : chat
        )
      );
    }
    setLoading(false);
  };

  // Design-Styles
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

  const currentMessages = chats.find(c => c.id === activeChatId)?.messages || [];

  return (
    <div style={{ display: "flex" }}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={{
          fontWeight: 800, fontSize: "1.1em", color: "#2f80ed", marginBottom: 9
        }}>
          Chats
        </div>
        {isLoadingChats && <div style={{ color: "#aaa" }}>Lädt…</div>}
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
            {(currentMessages.length === 0 && !loading) &&
              <div style={{
                color: "#90a4b8",
                textAlign: "center",
                marginTop: "35%"
              }}>Frag mich irgendwas …</div>
            }
            {currentMessages.map((msg, i) => (
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
