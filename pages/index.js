import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AuthForm from '../AuthForm';

export default function Home() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const chatEndRef = useRef(null);

  const SYSTEM_PROMPT = 'Du bist ein freundlicher, deutschsprachiger KI-Chatassistent.';

  // ---------- Auth ----------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription?.unsubscribe?.();
  }, []);

  // ---------- Chats laden (NEU: absteigend, neueste oben) ----------
  useEffect(() => {
    async function fetchChats() {
      setIsLoadingChats(true);
      if (!user) {
        setChats([]);
        setIsLoadingChats(false);
        return;
      }
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); // neueste zuerst

      if (!error && data) {
        setChats(data);
        if (data.length > 0) setActiveChatId(data[0].id);
      }
      setIsLoadingChats(false);
    }
    fetchChats();
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatId, chats, loading]);

  // ---------- Titel-Helfer ----------
  function simpleTitleFromText(text, maxWords = 7) {
    if (!text) return 'Neuer Chat';
    // Klammern/URLs/überflüssiges weg
    let s = text
      .replace(/\s+/g, ' ')
      .replace(/\[[^\]]*\]|\([^\)]*\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();
    const words = s.split(' ').slice(0, maxWords).join(' ');
    // Satzzeichen am Ende weg, ersten Buchstaben groß
    s = words.replace(/[.,;:!?-]+$/g, '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  async function generateTitleSmart(firstMessage) {
    // Optionaler smarter Endpoint. Fällt zurück auf simpleTitleFromText.
    try {
      const res = await fetch('/api/generateTitle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:
            `Erzeuge einen extrem kurzen, beschreibenden deutschen Chat-Titel (max. 6 Wörter, keine Anführungszeichen, kein Punkt) aus dieser ersten Nachricht:\n\n"${firstMessage}"`
        })
      });
      if (!res.ok) throw new Error('no 200');
      const { title } = await res.json();
      const cleaned = (title || '').toString().trim();
      return cleaned || simpleTitleFromText(firstMessage);
    } catch {
      return simpleTitleFromText(firstMessage);
    }
  }

  async function ensureTitleForChat(chatId, firstUserMessageText) {
    // Holt Chat, prüft, ob noch Platzhalter/nummeriert, setzt dann Titel.
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const isPlaceholder =
      !chat.title ||
      chat.title === 'Neuer Chat' ||
      /^Chat\s*#\d+$/i.test(chat.title);

    const hadNoMessages = (chat.messages?.length ?? 0) === 0;

    if (hadNoMessages && isPlaceholder && firstUserMessageText?.trim()) {
      const newTitle = await generateTitleSmart(firstUserMessageText);
      const { data: updated, error } = await supabase
        .from('chats')
        .update({ title: newTitle })
        .eq('id', chatId)
        .select()
        .single();

      if (!error && updated) {
        setChats(prev => prev.map(c => (c.id === chatId ? { ...c, title: newTitle } : c)));
      }
    }
  }

  // ---------- Neuer Chat ----------
  const handleNewChat = async () => {
    if (!user) return;
    const chatTitle = 'Neuer Chat'; // Platzhalter
    const { data, error } = await supabase
      .from('chats')
      .insert([{ title: chatTitle, messages: [], user_id: user.id }])
      .select()
      .single();
    if (!error && data) {
      setChats(chs => [data, ...chs]); // oben einfügen
      setActiveChatId(data.id);
      setInput('');
    }
  };

  // ---------- Nachricht senden ----------
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeChatId) return;

    const currentChat = chats.find(c => c.id === activeChatId);
    const isFirstMessage = (currentChat?.messages?.length ?? 0) === 0;

    const userMsg = { sender: "Du", text: input };
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
    // sofort im UI anzeigen
    setChats(chs => chs.map(chat => chat.id === activeChatId ? { ...chat, messages: newMessages } : chat));
    setInput('');

    // ---- Titel nach erster Nachricht setzen (nicht blockierend) ----
    if (isFirstMessage) {
      ensureTitleForChat(activeChatId, userMsg.text);
    }

    // ---- KI-Antwort holen ----
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
      setChats(chs => chs.map(chat => chat.id === activeChatId ? { ...chat, messages: updatedMessages } : chat));
    }
    setLoading(false);
  };

  // ---------- Stil-Token ----------
  const C = {
    bg: "#0e0f13",
    panel: "#111319",
    panelHover: "#171a22",
    border: "#1f2330",
    text: "#e7e9ee",
    sub: "#aab1c2",
    muted: "#8b91a1",
    accent: "#2f6bff"
  };

  // ---------- Styles ----------
  const sidebarStyle = {
    width: 280,
    background: C.panel,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "20px 14px",
    borderRight: `1px solid ${C.border}`,
    position: "fixed",
    left: 0, top: 0
  };

  const mainBgStyle = {
    background: C.bg,
    minHeight: "100vh",
    width: "100%",
    paddingLeft: 280,
    boxSizing: "border-box",
    fontFamily: '"Inter","SF Pro Text","Segoe UI",system-ui,-apple-system,sans-serif',
    color: C.text
  };

  const brandStyle = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 10px",
    marginBottom: 4,
    fontWeight: 700,
    fontSize: "14px",
    color: C.text,
    letterSpacing: ".02em"
  };

  const primaryBtn = {
    background: C.panelHover,
    color: C.text,
    border: `1px solid ${C.border}`,
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    textAlign: "left",
    cursor: "pointer"
  };

  const chatItem = (active) => ({
    ...primaryBtn,
    background: active ? "#0f121a" : "transparent",
    border: `1px solid ${active ? C.accent + "33" : "transparent"}`,
    color: active ? C.text : C.sub
  });

  const chatListStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 6,
    overflowY: "auto"
  };

  const headerStyle = {
    position: "sticky",
    top: 0,
    backdropFilter: "saturate(120%) blur(6px)",
    background: `${C.bg}cc`,
    borderBottom: `1px solid ${C.border}`,
    padding: "14px 0",
    zIndex: 1
  };

  const chatWrap = {
    maxWidth: 860,
    margin: "0 auto",
    padding: "0 20px 26px"
  };

  const messageRow = (role) => ({
    display: "flex",
    justifyContent: role === "user" ? "flex-end" : "flex-start",
    margin: "10px 0"
  });

  const bubble = (role) => ({
    maxWidth: "88%",
    padding: "12px 14px",
    borderRadius: 12,
    lineHeight: 1.6,
    fontSize: 16,
    whiteSpace: "pre-wrap",
    background: role === "user" ? C.panel : "#0f1218",
    border: `1px solid ${C.border}`
  });

  const inputBar = {
    display: "flex",
    gap: 8,
    padding: 16,
    borderTop: `1px solid ${C.border}`,
    position: "sticky",
    bottom: 0,
    background: `${C.bg}cc`,
    backdropFilter: "saturate(120%) blur(6px)"
  };

  const inputStyle = {
    flex: 1,
    padding: "14px 16px",
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    background: C.panel,
    color: C.text,
    fontSize: 16,
    outline: "none"
  };

  const sendBtn = {
    background: C.accent,
    color: "#fff",
    border: "none",
    padding: "12px 16px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 14,
    opacity: loading || !input.trim() ? 0.65 : 1,
    cursor: loading || !input.trim() ? "not-allowed" : "pointer"
  };

  const currentMessages = chats.find(c => c.id === activeChatId)?.messages || [];

  if (!user) {
    return (
      <div style={mainBgStyle}>
        <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AuthForm />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", width: "100vw", minHeight: "100vh", background: C.bg }}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={brandStyle}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: C.accent, display: "inline-block" }} />
          <span>Jiperia</span><span style={{ color: C.muted, fontWeight: 600 }}>MVP</span>
        </div>

        <button style={primaryBtn} onClick={handleNewChat}>+ Neuer Chat</button>

        <div style={{ marginTop: 8, color: C.muted, fontWeight: 600, fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase" }}>
          Archiv
        </div>

        {isLoadingChats && <div style={{ color: C.muted, fontSize: 13, padding: "8px 2px" }}>Lädt…</div>}

        <div style={chatListStyle}>
          {chats.map(chat => (
            <button
              key={chat.id}
              title={chat.title}
              style={chatItem(chat.id === activeChatId)}
              onClick={() => setActiveChatId(chat.id)}
            >
              <span style={{
                display: "inline-block",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                {chat.title || 'Neuer Chat'}
              </span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
          Eingeloggt als<br /><span style={{ fontWeight: 600, color: C.sub }}>{user?.email}</span>
        </div>
      </aside>

      {/* Main */}
      <main style={mainBgStyle}>
        <div style={headerStyle}>
          <div style={{ ...chatWrap, paddingTop: 0, paddingBottom: 0 }}>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>KI-Chat</h1>
            <div style={{ marginTop: 4, fontSize: 13, color: C.muted }}>Frag mich irgendwas.</div>
          </div>
        </div>

        <div style={{ ...chatWrap, paddingTop: 18 }}>
          <div style={{ minHeight: "56vh" }}>
            {currentMessages.length === 0 && !loading && (
              <div style={{ color: C.muted, textAlign: "center", marginTop: "18vh", fontSize: 15 }}>
                Starte mit einer Frage – z. B. <em>„Erklär mir JSON in 2 Sätzen“</em>
              </div>
            )}

            {currentMessages.map((msg, i) => {
              const role = msg.sender === "Du" ? "user" : "assistant";
              return (
                <div key={i} style={messageRow(role === "user" ? "user" : "assistant")}>
                  <div style={bubble(role === "user" ? "user" : "assistant")}>
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div style={messageRow("assistant")}>
                <div style={bubble("assistant")}><i>Antwort kommt …</i></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <form onSubmit={handleSend} style={inputBar}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Schreibe eine Nachricht…"
            style={inputStyle}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()} style={sendBtn}>Senden</button>
        </form>
      </main>

      <style jsx global>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        html, body { background: ${C.bg}; }
      `}</style>
    </div>
  );
}
