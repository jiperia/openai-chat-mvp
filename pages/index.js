import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AuthForm from '../AuthForm'; // Import wie in deinem Setup!

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
        if (data.length > 0) setActiveChatId(data[data.length-1].id);
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
    background: "#22242b",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 18,
    padding: "32px 18px 22px 22px",
    borderRight: "1.5px solid #2c2f3a"
  };
  const navBtn = isActive => ({
    background: isActive ? "#2c2f3a" : "none",
    color: isActive ? "#fff" : "#c1c5d0",
    border: "none",
    padding: "14px 18px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "1em",
    textAlign: "left",
    marginBottom: 8,
    cursor: "pointer",
    opacity: isActive ? 1 : 0.88
  });
  const mainBgStyle = {
    background: "#22242b",
    minHeight: "100vh",
    width: "100%",
    paddingLeft: 240,
    boxSizing: "border-box",
    fontFamily: '"Inter","Segoe UI","Arial",sans-serif',
    color: "#e1e3e8"
  };
  const chatCardStyle = {
    background: "none",
    borderRadius: "0",
    boxShadow: "none",
    maxWidth: 800,
    margin: "50px auto 0",
    padding: "16px 0 18px 0",
    minHeight: 540,
    display: "flex",
    flexDirection: "column"
  };
  const currentMessages = chats.find(c => c.id === activeChatId)?.messages || [];

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
    <div style={{ display: "flex", width: "100vw", minHeight: "100vh", fontFamily: '"Inter","Segoe UI","Arial",sans-serif' }}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={{
          fontWeight: 800, fontSize: "1.1em", color: "#fff", marginBottom: 8, letterSpacing: ".02em"
        }}>
          Langdock Kopie
        </div>
        <button style={navBtn(false)} onClick={handleNewChat}>
          + Neuer Chat
        </button>
        <div style={{ fontWeight: 700, color: "#99abc7", fontSize: "0.97em", margin: "10px 0 2px 0" }}>
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
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: "0.90em", color: "#7d8798", marginTop: 20 }}>
          Eingeloggt als<br /><span style={{ fontWeight: 700 }}>{user?.email}</span>
        </div>
      </aside>
      <main style={mainBgStyle}>
        <div style={chatCardStyle}>
          <h1 style={{
            textAlign: "left",
            color: "#fff",
            fontWeight: 900,
            marginBottom: 18,
            fontSize: "1.32em",
            letterSpacing: "0.04em"
          }}>
            KI-Chat MVP
          </h1>
          {/* Nachrichtenliste wie Langdock – nur Text */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", marginTop: 12 }}>
            {currentMessages.length === 0 && !loading &&
              <div style={{
                color: "#a3a8ab",
                textAlign: "center",
                marginTop: "35%",
                fontSize: "1.05em"
              }}>Frag mich irgendwas …</div>
            }
            {currentMessages.map((msg, i) => (
              <div key={i} style={{
                margin: "15px 0",
                padding: 0,
                fontSize: "1.12em",
                color: "#e1e4eb",
                lineHeight: 1.68,
                display: "flex",
                flexDirection: "row"
              }}>
                <span style={{
                  fontSize: ".94em",
                  color: "#b7bbcb",
                  marginRight: 10,
                  fontWeight: 600,
                  letterSpacing: ".01em"
                }}>{msg.sender === "Du" ? "Ich" : "KI"}:</span>
                <span style={{
                  fontWeight: 440
                }}>{msg.text}</span>
              </div>
            ))}
            {loading &&
              <div style={{
                margin: "15px 0",
                fontStyle: "italic",
                color: "#878a92",
                fontSize: "1.08em"
              }}>Antwort kommt …</div>
            }
            <div ref={chatEndRef}></div>
          </div>
          <form onSubmit={handleSend} style={{
            display: "flex", gap: 10, marginTop: 24, borderTop: "1px solid #353842", paddingTop: 16
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Deine Nachricht …"
              style={{
                flex: 1,
                padding: "14px 16px",
                borderRadius: 8,
                border: "1px solid #353842",
                background: "#232531",
                color: "#eee",
                fontSize: "1.08em",
                outline: "none"
              }}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} style={{
              background: "#232531",
              color: "#fff",
              border: "none",
              padding: "14px 23px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: "1.00em",
              letterSpacing: ".015em",
              opacity: loading || !input.trim() ? 0.65 : 1,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              transition: "all 0.16s"
            }}>⤴</button>
          </form>
        </div>
      </main>
    </div>
  );
}
