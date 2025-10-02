import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AuthForm from '../AuthForm'; // Korrektes Importverzeichnis!

export default function Home() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const chatEndRef = useRef(null);

  const SYSTEM_PROMPT = 'Du bist ein freundlicher, deutschsprachiger KI-Chatassistent.';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function fetchChats() {
      setIsLoadingChats(true);
      if (!user) {
        setChats([]);
        setIsLoadingChats(false);
        return;
      }
      let { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setChats(data);
        if (data.length > 0) setActiveChatId(data[data.length-1].id); // Zeige neuesten Chat zuerst!
      }
      setIsLoadingChats(false);
    }
    fetchChats();
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatId, chats, loading]);

  // Neuer Chat
  const handleNewChat = async () => {
    if (!user) return;
    const chatTitle = `Chat #${chats.length + 1}`;
    const { data, error } = await supabase
      .from('chats')
      .insert([{ title: chatTitle, messages: [], user_id: user.id }])
      .select()
      .single();
    if (!error && data) {
      setChats(chs => [...chs, data]);
      setActiveChatId(data.id);
      setInput('');
    }
  };

  // Nachricht senden
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeChatId) return;
    const userMsg = { sender: "Du", text: input };
    const currentChat = chats.find(c => c.id === activeChatId);
    const newMessages = [...(currentChat?.messages || []), userMsg];
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
    setChats(chs =>
      chs.map(chat =>
        chat.id === activeChatId ? { ...chat, messages: newMessages } : chat
      )
    );
    setInput('');
    // KI-Request wie gehabt
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    const updatedMessages = [...newMessages, { sender: "KI", text: answer }];
    const { data: updatedChat, error: errUpdate } = await supabase
      .from("chats")
      .update({ messages: updatedMessages })
      .eq("id", activeChatId)
      .select()
      .single();
    if (!errUpdate && updatedChat) {
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

  // Styling
  const sidebarStyle = {
    width: 240,
    background: "#f9fafc",
    borderRight: "1.5px solid #e5e7eb",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 18,
    padding: "36px 18px 24px 22px",
  };

  const navBtn = isActive => ({
    background: isActive ? "#2563eb" : "#fff",
    color: isActive ? "#fff" : "#222",
    border: "none",
    padding: "14px 28px",
    borderRadius: "14px",
    boxShadow: isActive ? "0 2px 12px #2563eb15" : "none",
    fontWeight: 600,
    fontSize: "1em",
    textAlign: "left",
    marginBottom: 10,
    cursor: "pointer",
    opacity: isActive ? 1 : 0.87,
    transition: "all 0.17s"
  });

  const mainBgStyle = {
    background: "linear-gradient(120deg,#f6fafd 40%,#e8eef3 100%)",
    minHeight: "100vh",
    width: "100%",
    paddingLeft: 240,
    boxSizing: "border-box"
  };

  const chatCardStyle = {
    background: "#fff",
    borderRadius: "22px",
    boxShadow: "0 8px 40px rgba(40,60,100,0.10)",
    maxWidth: 520,
    margin: "64px auto 0",
    padding: "32px 24px",
    minHeight: 440,
    display: "flex",
    flexDirection: "column"
  };

  const bubbleStyle = sender => ({
    maxWidth: "70%",
    padding: "14px 18px",
    borderRadius: 18,
    margin: "4px 0",
    background: sender === "Du" ? "#2563eb" : "#f5f7fa",
    color: sender === "Du" ? "#fff" : "#222",
    alignSelf: sender === "Du" ? "flex-end" : "flex-start",
    boxShadow: "0 2px 12px rgba(40,60,100,0.06)",
    fontWeight: sender === "Du" ? 500 : 400
  });

  const currentMessages = chats.find(c => c.id === activeChatId)?.messages || [];

  // Falls kein User: Login-Form anzeigen!
  if (!user) {
    return (
      <div style={mainBgStyle}>
        <div style={{
          width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <AuthForm />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", width: "100vw", minHeight: "100vh", fontFamily: 'Inter, Arial, sans-serif' }}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={{
          fontWeight: 800, fontSize: "1.1em", color: "#2563eb", marginBottom: 9, letterSpacing: ".04em"
        }}>
          🦾 KI-Chat
        </div>
        <button style={navBtn(false)} onClick={handleNewChat}>
          + Neuer Chat
        </button>
        <div style={{ fontWeight: 700, color: "#99abc7", fontSize: "1em", margin: "12px 0 2px 0" }}>
          Archiv
        </div>
        {isLoadingChats && <div style={{ color: "#bbb", marginBottom: 9 }}>Lädt…</div>}
        {chats.map(chat => (
          <button
            key={chat.id}
            style={navBtn(chat.id === activeChatId)}
            onClick={() => setActiveChatId(chat.id)}
          >
            {chat.title}
          </button>
        ))}
        {/* Platz (z. B. für Rollen, Settings usw.) */}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: "0.92em", color: "#b3b8be", marginTop: 24 }}>
          Eingeloggt als<br /><span style={{ fontWeight: 700 }}>{user?.email}</span>
        </div>
      </aside>

      {/* Main Chat */}
      <main style={mainBgStyle}>
        <div style={chatCardStyle}>
          <h1 style={{
            textAlign: "center",
            color: "#2563eb",
            fontWeight: 900,
            letterSpacing: "0.06em",
            marginBottom: 8,
            fontSize: "1.38em"
          }}>
            💬 KI-Chat MVP
          </h1>
          <div style={{ marginBottom: 18, textAlign: "center", color: "#adcbe6", fontWeight: 500, fontSize: "1.02em" }}>
            {chats.length === 0 ? "Starte einen neuen Chat!" : "Verlauf & Antworten"}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {(currentMessages.length === 0 && !loading) &&
              <div style={{
                color: "#adcbe6",
                textAlign: "center",
                marginTop: "35%"
              }}>Frag mich irgendwas …</div>
            }
            {currentMessages.map((msg, i) => (
              <div key={i} style={bubbleStyle(msg.sender)}>
                <span style={{
                  fontWeight: 700,
                  fontSize: "0.92em",
                  color: msg.sender === "Du" ? "#e7f0fd" : "#88a",
                  letterSpacing: ".01em"
                }}>{msg.sender}:</span>
                <span style={{ marginLeft: 8 }}>{msg.text}</span>
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
            display: "flex", gap: 10, marginTop: 22
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Deine Nachricht …"
              style={{
                flex: 1,
                padding: "15px 18px",
                borderRadius: 14,
                border: "1.5px solid #adcbe6",
                background: "#f9fafc",
                fontSize: "1em",
                outline: "none"
              }}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "15px 26px",
              borderRadius: 14,
              fontWeight: 700,
              fontSize: "1em",
              letterSpacing: ".015em",
              boxShadow: loading ? "none" : "0 2px 8px #2563eb19",
              opacity: loading || !input.trim() ? 0.65 : 1,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              transition: "all 0.16s"
            }}>Senden</button>
          </form>
        </div>
      </main>
    </div>
  );
}
