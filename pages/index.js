// pages/index.js
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AuthForm from '../AuthForm';

export default function Home() {
  // ---------------- State ----------------
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [menuOpenFor, setMenuOpenFor] = useState(null); // chatId oder null
  const chatEndRef = useRef(null);
  const menuRef = useRef(null);

  const SYSTEM_PROMPT = 'Du bist ein freundlicher, deutschsprachiger KI-Chatassistent.';

  // ---------------- Auth ----------------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription?.unsubscribe?.();
  }, []);

  // ---------------- Chats laden (neueste oben) ----------------
  useEffect(() => {
    async function fetchChats() {
      setIsLoadingChats(true);
      if (!user) { setChats([]); setIsLoadingChats(false); return; }
      const { data } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
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

  // ---------------- Close menu on outside / ESC ----------------
  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpenFor(null);
    }
    function onKey(e) { if (e.key === 'Escape') setMenuOpenFor(null); }
    if (menuOpenFor) document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpenFor]);

  // ---------------- Titel-Logik ----------------
  function simpleTitleFromText(text, maxWords = 7) {
    if (!text) return 'Neuer Chat';
    let s = text
      .replace(/\s+/g, ' ')
      .replace(/\[[^\]]*\]|\([^\)]*\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();
    s = s.split(' ').slice(0, maxWords).join(' ').replace(/[.,;:!?-]+$/g, '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  async function generateTitleSmart(firstMessage) {
    try {
      const res = await fetch('/api/generateTitle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Erzeuge einen extrem kurzen, prägnanten deutschen Chat-Titel (max. 6 Wörter, keine Anführungszeichen, kein Punkt) aus dieser ersten Nachricht:\n\n"${firstMessage}"`
        })
      });
      if (!res.ok) throw new Error('no 200');
      const { title } = await res.json();
      return (title || '').trim() || simpleTitleFromText(firstMessage);
    } catch {
      return simpleTitleFromText(firstMessage);
    }
  }

  async function ensureTitleForChat(chatId, firstUserMessageText) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    const isPlaceholder = !chat.title || chat.title === 'Neuer Chat' || /^Chat\s*#\d+$/i.test(chat.title);
    const hadNoMessages = (chat.messages?.length ?? 0) === 0;

    if (hadNoMessages && isPlaceholder && firstUserMessageText?.trim()) {
      const newTitle = await generateTitleSmart(firstUserMessageText);
      const { data: updated } = await supabase
        .from('chats')
        .update({ title: newTitle })
        .eq('id', chatId)
        .select()
        .single();
      if (updated) {
        setChats(prev => prev.map(c => (c.id === chatId ? { ...c, title: newTitle } : c)));
      }
    }
  }

  // ---------------- Aktionen ----------------
  async function handleRenameChat(chatId) {
    const current = chats.find(c => c.id === chatId);
    const name = window.prompt('Neuer Titel:', current?.title || '');
    if (!name || !name.trim()) return;
    const { data } = await supabase
      .from('chats')
      .update({ title: name.trim() })
      .eq('id', chatId)
      .select()
      .single();
    if (data) setChats(prev => prev.map(c => (c.id === chatId ? { ...c, title: name.trim() } : c)));
  }

  async function handleDeleteChat(chatId) {
    if (!window.confirm('Diesen Chat wirklich löschen?')) return;
    await supabase.from('chats').delete().eq('id', chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(chats.find(c => c.id !== chatId)?.id ?? null);
    }
  }

  async function handleToggleShare(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    const next = !chat.is_public;
    const { data } = await supabase
      .from('chats')
      .update({ is_public: next })
      .eq('id', chatId)
      .select()
      .single();
    if (data) {
      setChats(prev => prev.map(c => (c.id === chatId ? { ...c, is_public: next } : c)));
      if (next) {
        const shareUrl = `${window.location.origin}/share/${chat.public_id}`;
        navigator.clipboard?.writeText(shareUrl).catch(() => {});
        alert(`Öffentlicher Link kopiert:\n${shareUrl}`);
      }
    }
  }

  // ---------------- Neuer Chat ----------------
  const handleNewChat = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const me = authData?.user || user;
      if (!me?.id) {
        alert('Nicht eingeloggt – bitte neu anmelden.');
        return;
      }

      const payload = { title: 'Neuer Chat', messages: [], user_id: me.id };
      const { data, error } = await supabase.from('chats').insert([payload]).select().single();

      if (error) {
        console.error('INSERT chats error:', error, { payload });
        alert('Konnte Chat nicht anlegen:\n' + (error.message || JSON.stringify(error)));
        return;
      }

      setChats(chs => [data, ...chs]);
      setActiveChatId(data.id);
      setInput('');
    } catch (e) {
      console.error('handleNewChat fatal:', e);
      alert('Unerwarteter Fehler beim Anlegen des Chats: ' + (e.message || e));
    }
  };

  // ---------------- Senden (Streaming) ----------------
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeChatId) return;

    const currentChat = chats.find(c => c.id === activeChatId);
    const isFirstMessage = (currentChat?.messages?.length ?? 0) === 0;

    const userMsg = { sender: 'Du', text: input };
    const assistantMsg = { sender: 'KI', text: '' };
    const newMessagesLocal = [...(currentChat?.messages || []), userMsg, assistantMsg];

    const openaiHistory = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...newMessagesLocal
        .filter(m => m.text !== '' || m.sender === 'KI')
        .map(m => (m.sender === 'Du' ? { role: 'user', content: m.text } : (m.text ? { role: 'assistant', content: m.text } : null)))
        .filter(Boolean)
    ];

    setLoading(true);
    setChats(chs => chs.map(c => (c.id === activeChatId ? { ...c, messages: newMessagesLocal } : c)));
    setInput('');
    if (isFirstMessage) ensureTitleForChat(activeChatId, userMsg.text);

    try {
      const res = await fetch('/api/chatStream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: openaiHistory })
      });
      if (!res.ok || !res.body) throw new Error('stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.replace(/^data:\s*/, '').trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              setChats(prev =>
                prev.map(c => {
                  if (c.id !== activeChatId) return c;
                  const msgs = [...c.messages];
                  msgs[msgs.length - 1] = { sender: 'KI', text: fullText };
                  return { ...c, messages: msgs };
                })
              );
            }
          } catch { /* ignore */ }
        }
      }

      const finalMessages = (() => {
        const c = chats.find(x => x.id === activeChatId);
        const msgs = (c?.messages || newMessagesLocal).map(m => ({ ...m }));
        msgs[msgs.length - 1] = { sender: 'KI', text: fullText || ' ' };
        return msgs;
      })();

      await supabase.from('chats').update({ messages: finalMessages }).eq('id', activeChatId);
    } catch (err) {
      setChats(prev =>
        prev.map(c => {
          if (c.id !== activeChatId) return c;
          const msgs = [...c.messages];
          msgs[msgs.length - 1] = { sender: 'KI', text: 'Fehler bei KI' };
          return { ...c, messages: msgs };
        })
      );
    }

    setLoading(false);
  };

  // ---------------- Styles ----------------
  const C = {
    bg: '#0e0f13',
    panel: '#111319',
    panelHover: '#171a22',
    border: '#1f2330',
    text: '#e7e9ee',
    sub: '#aab1c2',
    muted: '#8b91a1',
    accent: '#2f6bff'
  };

  const SIDEBAR_W = 300;

  const sidebarStyle = {
    width: SIDEBAR_W,
    background: C.panel,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '22px 16px',
    borderRight: `1px solid ${C.border}`,
    position: 'fixed',
    left: 0, top: 0
  };

  const mainBgStyle = {
    background: C.bg,
    minHeight: '100vh',
    width: '100%',
    paddingLeft: SIDEBAR_W,
    boxSizing: 'border-box',
    fontFamily: '"Inter","SF Pro Text","Segoe UI",system-ui,-apple-system,sans-serif',
    color: C.text,
    overflowX: 'hidden'
  };

  const brandStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 10px',
    marginBottom: 6,
    fontWeight: 700,
    fontSize: 14,
    color: C.text,
    letterSpacing: '.02em'
  };

  const primaryBtn = {
    background: C.panelHover,
    color: C.text,
    border: `1px solid ${C.border}`,
    padding: '11px 12px',
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 14,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'transform .12s ease, background .12s ease'
  };

  const chatItem = (active) => ({
    ...primaryBtn,
    position: 'relative',
    paddingRight: 44,
    background: active ? '#0f121a' : 'transparent',
    border: `1px solid ${active ? C.accent + '33' : 'transparent'}`,
    color: active ? C.text : C.sub,
    overflow: 'hidden'
  });

  const chatListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
    paddingRight: 4,
    overflowY: 'auto'
  };

  const headerStyle = {
    position: 'sticky',
    top: 0,
    backdropFilter: 'saturate(120%) blur(6px)',
    background: `${C.bg}cc`,
    borderBottom: `1px solid ${C.border}`,
    padding: '16px 0',
    zIndex: 1
  };

  const chatWrap = {
    maxWidth: 860,
    width: '92vw',
    margin: '0 auto',
    padding: '0 20px 26px'
  };

  const messageRow = (role) => ({
    display: 'flex',
    justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
    margin: '10px 0'
  });

  const bubble = (role) => ({
    maxWidth: '88%',
    padding: '12px 14px',
    borderRadius: 12,
    lineHeight: 1.6,
    fontSize: 16,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    background: role === 'user' ? C.panel : '#0f1218',
    border: `1px solid ${C.border}`
  });

  const inputBarOuter = {
    position: 'sticky',
    bottom: 0,
    background: `${C.bg}cc`,
    backdropFilter: 'saturate(120%) blur(6px)',
    borderTop: `1px solid ${C.border}`,
    padding: '16px 0'
  };

  const inputBarInner = {
    maxWidth: 740,
    width: '92vw',
    margin: '0 auto',
    display: 'flex',
    gap: 8
  };

  const inputStyle = {
    flex: 1,
    padding: '14px 16px',
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    background: C.panel,
    color: C.text,
    fontSize: 16,
    outline: 'none'
  };

  const sendBtn = {
    background: C.accent,
    color: '#fff',
    border: 'none',
    padding: '12px 16px',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 14,
    opacity: loading || !input.trim() ? 0.65 : 1,
    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer'
  };

  // --- 3-Punkte-Menü Styles ---
  const dotsBtn = {
    background: 'transparent',
    border: `1px solid ${C.border}`,
    color: C.sub,
    width: 28,
    height: 28,
    lineHeight: '26px',
    textAlign: 'center',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'none' // nur bei Hover sichtbar (siehe globales CSS)
  };

  const menuPopover = {
    position: 'absolute',
    right: 6,
    top: 44,
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    boxShadow: '0 12px 30px rgba(0,0,0,.42)',
    overflow: 'hidden',
    zIndex: 10,
    minWidth: 220
  };

  const menuItem = {
    width: '100%',
    textAlign: 'left',
    padding: '12px 14px',
    background: 'transparent',
    border: 'none',
    color: C.text,
    cursor: 'pointer',
    fontSize: 14
  };

  const Divider = () => (
    <div style={{ height: 1, background: C.border, opacity: .7 }} />
  );

  // ---------------- Rendering ----------------
  const currentMessages = chats.find(c => c.id === activeChatId)?.messages || [];

  if (!user) {
    return (
      <div style={mainBgStyle}>
        <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AuthForm />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100vw', minHeight: '100vh', background: C.bg }}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={brandStyle}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: C.accent, display: 'inline-block' }} />
          <span>Jiperia</span><span style={{ color: C.muted, fontWeight: 600 }}>MVP</span>
        </div>

        <button style={primaryBtn} onClick={handleNewChat}>+ Neuer Chat</button>

        <div style={{ height: '25vh' }} />

        <div style={{ marginTop: 4, color: C.muted, fontWeight: 600, fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          Archiv
        </div>

        {isLoadingChats && <div style={{ color: C.muted, fontSize: 13, padding: '8px 2px' }}>Lädt…</div>}

        <div style={chatListStyle}>
          {chats.map(chat => {
            const isActive = chat.id === activeChatId;
            const isMenuOpen = menuOpenFor === chat.id;
            return (
              <div key={chat.id} style={{ position: 'relative' }} ref={isMenuOpen ? menuRef : null}>
                {/* Haupt-Row */}
                <button
                  className="chat-row"
                  title={chat.title}
                  style={chatItem(isActive)}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  <span style={{
                    display: 'inline-block',
                    maxWidth: 'calc(100% - 44px)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 640
                  }}>
                    {chat.title || 'Neuer Chat'}
                  </span>

                  {/* Dots rechts (nur bei Hover sichtbar) */}
                  <span style={{ position: 'absolute', right: 8, top: 7 }}>
                    <button
                      className="dots"
                      aria-label="Menü"
                      title="Menü"
                      style={dotsBtn}
                      onClick={(e) => { e.stopPropagation(); setMenuOpenFor(p => p === chat.id ? null : chat.id); }}
                    >
                      {/* vertikale Punkte: */}
                      <span style={{ fontSize: 18, position: 'relative', top: -1 }}>⋮</span>
                    </button>
                  </span>
                </button>

                {/* Popover-Menü */}
                {isMenuOpen && (
                  <div style={menuPopover} onClick={e => e.stopPropagation()}>
                    <button
                      style={menuItem}
                      onMouseEnter={(e)=> e.currentTarget.style.background = C.panelHover}
                      onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}
                      onClick={() => { setMenuOpenFor(null); handleRenameChat(chat.id); }}
                    >
                      Umbenennen
                    </button>

                    <Divider />

                    <button
                      style={{ ...menuItem, color: chat.is_public ? '#6ee7b7' : C.text }}
                      onMouseEnter={(e)=> e.currentTarget.style.background = C.panelHover}
                      onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}
                      onClick={() => { setMenuOpenFor(null); handleToggleShare(chat.id); }}
                    >
                      {chat.is_public ? 'Teilen deaktivieren' : 'Teilen aktivieren'}
                    </button>

                    <Divider />

                    <button
                      style={{ ...menuItem, color: '#f87171' }}
                      onMouseEnter={(e)=> e.currentTarget.style.background = C.panelHover}
                      onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}
                      onClick={() => { setMenuOpenFor(null); handleDeleteChat(chat.id); }}
                    >
                      Löschen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
          <div style={{ minHeight: '56vh' }}>
            {currentMessages.length === 0 && !loading && (
              <div style={{ color: C.muted, textAlign: 'center', marginTop: '18vh', fontSize: 15 }}>
                Starte mit einer Frage – z. B. <em>„Erklär mir JSON in 2 Sätzen“</em>
              </div>
            )}

            {currentMessages.map((msg, i) => {
              const role = msg.sender === 'Du' ? 'user' : 'assistant';
              return (
                <div key={i} style={messageRow(role === 'user' ? 'user' : 'assistant')}>
                  <div style={bubble(role === 'user' ? 'user' : 'assistant')}>{msg.text}</div>
                </div>
              );
            })}

            {loading && (
              <div style={messageRow('assistant')}>
                <div style={bubble('assistant')}><i>Antwort kommt …</i></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input */}
        <div style={inputBarOuter}>
          <form onSubmit={handleSend} style={inputBarInner}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Schreibe eine Nachricht…"
              style={inputStyle}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} style={sendBtn}>Senden</button>
          </form>
        </div>
      </main>

      {/* Global Styles */}
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { background: ${C.bg}; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }

        /* Dots nur bei Hover der Zeile zeigen */
        .chat-row:hover .dots { display: inline-block !important; }
        .chat-row:hover { transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
