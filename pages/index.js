// pages/index.js
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription?.unsubscribe?.();
  }, []);

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

  // ---- Title helpers ----
  function simpleTitleFromText(text, maxWords = 7) {
    if (!text) return 'Neuer Chat';
    let s = text.replace(/\s+/g, ' ').replace(/\[[^\]]*\]|\([^\)]*\)/g, '').replace(/https?:\/\/\S+/g, '').trim();
    s = s.split(' ').slice(0, maxWords).join(' ').replace(/[.,;:!?-]+$/g, '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  async function generateTitleSmart(firstMessage) {
    try {
      const res = await fetch('/api/generateTitle', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Erzeuge einen extrem kurzen, prägnanten deutschen Chat-Titel (max. 6 Wörter, keine Anführungszeichen, kein Punkt) aus dieser ersten Nachricht:\n\n"${firstMessage}"` })
      });
      if (!res.ok) throw new Error('no 200');
      const { title } = await res.json();
      return (title || '').trim() || simpleTitleFromText(firstMessage);
    } catch { return simpleTitleFromText(firstMessage); }
  }
  async function ensureTitleForChat(chatId, firstUserMessageText) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    const isPlaceholder = !chat.title || chat.title === 'Neuer Chat' || /^Chat\s*#\d+$/i.test(chat.title);
    const hadNoMessages = (chat.messages?.length ?? 0) === 0;
    if (hadNoMessages && isPlaceholder && firstUserMessageText?.trim()) {
      const newTitle = await generateTitleSmart(firstUserMessageText);
      const { data: updated } = await supabase.from('chats').update({ title: newTitle }).eq('id', chatId).select().single();
      if (updated) setChats(prev => prev.map(c => (c.id === chatId ? { ...c, title: newTitle } : c)));
    }
  }

  // ---- CRUD Buttons (rename/delete/share) ----
  async function handleRenameChat(chatId) {
    const current = chats.find(c => c.id === chatId);
    const name = window.prompt('Neuer Titel:', current?.title || '');
    if (!name || !name.trim()) return;
    const { data } = await supabase.from('chats').update({ title: name.trim() }).eq('id', chatId).select().single();
    if (data) setChats(prev => prev.map(c => (c.id === chatId ? { ...c, title: name.trim() } : c)));
  }
  async function handleDeleteChat(chatId) {
    if (!window.confirm('Diesen Chat wirklich löschen?')) return;
    await supabase.from('chats').delete().eq('id', chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) setActiveChatId(prev => (chats.find(c => c.id !== chatId)?.id ?? null));
  }
  async function handleToggleShare(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    const next = !chat.is_public;
    const { data } = await supabase.from('chats').update({ is_public: next }).eq('id', chatId).select().single();
    if (data) {
      setChats(prev => prev.map(c => (c.id === chatId ? { ...c, is_public: next } : c)));
      if (next) {
        const shareUrl = `${window.location.origin}/share/${chat.public_id}`;
        navigator.clipboard?.writeText(shareUrl).catch(() => {});
        alert(`Öffentlicher Link kopiert:\n${shareUrl}`);
      }
    }
  }

  // ---- New Chat ----
  const handleNewChat = async () => {
    if (!user) return;
    const { data } = await supabase.from('chats').insert([{ title: 'Neuer Chat', messages: [], user_id: user.id }]).select().single();
    if (data) { setChats(chs => [data, ...chs]); setActiveChatId(data.id); setInput(''); }
  };

  // ---- STREAMING Send ----
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeChatId) return;

    const currentChat = chats.find(c => c.id === activeChatId);
    const isFirstMessage = (currentChat?.messages?.length ?? 0) === 0;

    const userMsg = { sender: "Du", text: input };
    const assistantMsg = { sender: "KI", text: "" }; // Platzhalter für Stream

    const newMessagesLocal = [...(currentChat?.messages || []), userMsg, assistantMsg];

    const openaiHistory = [
      { role: "system", content: SYSTEM_PROMPT },
      ...newMessagesLocal
        .filter(m => m.text !== "" || m.sender === "KI") // KI leeres erlaubt als Platzhalter
        .map(m => m.sender === "Du" ? { role: "user", content: m.text } : (m.text ? { role: "assistant", content: m.text } : null))
        .filter(Boolean)
    ];

    setLoading(true);
    setChats(chs => chs.map(c => c.id === activeChatId ? { ...c, messages: newMessagesLocal } : c));
    setInput('');

    if (isFirstMessage) ensureTitleForChat(activeChatId, userMsg.text);

    // Stream konsumieren
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

        // OpenAI SSE liefert Zeilen wie: "data: {...}\n\n"
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.replace(/^data:\s*/, '').trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              // letzte Nachricht (KI Platzhalter) aktualisieren
              setChats(prev =>
                prev.map(c => {
                  if (c.id !== activeChatId) return c;
                  const msgs = [...c.messages];
                  msgs[msgs.length - 1] = { sender: "KI", text: fullText };
                  return { ...c, messages: msgs };
                })
              );
            }
          } catch { /* ignore */ }
        }
      }

      // final in Supabase speichern
      const finalMessages = (() => {
        const c = chats.find(x => x.id === activeChatId);
        // falls sich state inzwischen geändert hat, nimm die im State
        const msgs = (c?.messages || newMessagesLocal).map(m => ({ ...m }));
        msgs[msgs.length - 1] = { sender: "KI", text: fullText || " " };
        return msgs;
      })();

      await supabase.from("chats").update({ messages: finalMessages }).eq("id", activeChatId);
    } catch (err) {
      // Fehlertext in Platzhalter schreiben
      setChats(prev =>
        prev.map(c => {
          if (c.id !== activeChatId) return c;
          const msgs = [...c.messages];
          msgs[msgs.length - 1] = { sender: "KI", text: "Fehler bei KI" };
          return { ...c, messages: msgs };
        })
      );
    }

    setLoading(false);
  };

  // ---- Styles (wie zuvor, plus kleine Buttons im Archiv) ----
  const C = { bg:"#0e0f13", panel:"#111319", panelHover:"#171a22", border:"#1f2330", text:"#e7e9ee", sub:"#aab1c2", muted:"#8b91a1", accent:"#2f6bff" };
  const SIDEBAR_W = 280;

  const sidebarStyle = { width:SIDEBAR_W, background:C.panel, minHeight:"100vh", display:"flex", flexDirection:"column", gap:12, padding:"20px 14px", borderRight:`1px solid ${C.border}`, position:"fixed", left:0, top:0 };
  const mainBgStyle = { background:C.bg, minHeight:"100vh", width:"100%", paddingLeft:SIDEBAR_W, boxSizing:"border-box", fontFamily:'"Inter","SF Pro Text","Segoe UI",system-ui,-apple-system,sans-serif', color:C.text, overflowX:"hidden" };
  const brandStyle = { display:"flex", alignItems:"center", gap:10, padding:"6px 10px", marginBottom:4, fontWeight:700, fontSize:14, color:C.text, letterSpacing:".02em" };
  const primaryBtn = { background:C.panelHover, color:C.text, border:`1px solid ${C.border}`, padding:"10px 12px", borderRadius:10, fontWeight:600, fontSize:14, textAlign:"left", cursor:"pointer" };
  const chatItem = (active)=>({ ...primaryBtn, position:'relative', paddingRight:86, background:active?"#0f121a":"transparent", border:`1px solid ${active ? C.accent+"33":"transparent"}`, color:active?C.text:C.sub });
  const chatListStyle = { display:"flex", flexDirection:"column", gap:6, marginTop:6, overflowY:"auto" };
  const headerStyle = { position:"sticky", top:0, backdropFilter:"saturate(120%) blur(6px)", background:`${C.bg}cc`, borderBottom:`1
