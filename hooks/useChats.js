// hooks/useChats.js
// Zweck: Alle Chat-Zustände & Aktionen (Laden, CRUD, Teilen, Streaming, Auto-Titel)
// Extra: Pro Chat wird `searchText` gepflegt (Titel + letzte Messages), damit die Suche Inhalte findet.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { generateTitleSmart } from '../lib/title';

const SYSTEM_PROMPT = 'Du bist ein freundlicher, deutschsprachiger KI-Chatassistent.';

// Hilfsfunktion: Suchtext aus Titel + letzten N Nachrichten bauen
function buildSearchText(chat, take = 8) {
  const title = chat?.title || '';
  const tail = Array.isArray(chat?.messages)
    ? chat.messages.slice(-take).map(m => m?.text || '').join(' ')
    : '';
  return `${title} ${tail}`.toLowerCase();
}

export default function useChats(user) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [loading, setLoading] = useState(false);

  // ---------- Laden ----------
  useEffect(() => {
    if (!user) { setChats([]); setActiveChatId(null); return; }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select('*')                               // nur vorhandene Spalten
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); // sicherer Sortier-Key

      if (cancelled) return;
      setLoading(false);

      if (error) {
        console.error('load chats error', error);
        setChats([]);
        setActiveChatId(null);
        return;
      }

      const mapped = (data || []).map(c => ({
        ...c,
        title: c.title || 'Neuer Chat',
        messages: Array.isArray(c.messages) ? c.messages : [],
        searchText: buildSearchText(c),
      }));

      setChats(mapped);
      if (mapped.length) setActiveChatId(mapped[0].id);
    })();

    return () => { cancelled = true; };
  }, [user]);

  // ---------- Abgeleitete Werte ----------
  const activeMessages = useMemo(
    () => chats.find(c => c.id === activeChatId)?.messages || [],
    [chats, activeChatId]
  );

  // ---------- Aktionen ----------
  async function newChat() {
    const payload = { title: 'Neuer Chat', messages: [], user_id: user.id };
    const { data, error } = await supabase
      .from('chats')
      .insert([payload])
      .select('*')
      .single();
    if (error) { console.error('newChat error', error); return; }

    const created = {
      ...data,
      title: data.title || 'Neuer Chat',
      messages: Array.isArray(data.messages) ? data.messages : [],
      searchText: buildSearchText(data),
    };
    setChats(prev => [created, ...prev]);
    setActiveChatId(created.id);
  }

  async function renameChat(id, title) {
    const name = (title ?? '').trim();
    if (!name) return;

    const { data, error } = await supabase
      .from('chats')
      .update({ title: name })
      .eq('id', id)
      .select('*')
      .single();

    if (error) { console.error('renameChat error', error); return; }

    setChats(prev => prev.map(c =>
      c.id === id
        ? { ...data, title: data.title || 'Neuer Chat', messages: Array.isArray(data.messages) ? data.messages : [], searchText: buildSearchText(data) }
        : c
    ));
  }

  async function deleteChat(id) {
    const { error } = await supabase.from('chats').delete().eq('id', id);
    if (error) { console.error('deleteChat error', error); return; }

    setChats(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
      return filtered;
    });
  }

  // Defensiv: Sharing nur, wenn Felder existieren; sonst freundlich abfangen
  async function toggleShare(id) {
    const chat = chats.find(c => c.id === id);
    if (!chat) return;

    if (!('is_public' in chat) || !('public_id' in chat)) {
      alert('Teilen ist in diesem MVP noch nicht aktiviert (Spalten is_public/public_id fehlen).');
      return;
    }

    const next = !chat.is_public;
    const { data, error } = await supabase
      .from('chats')
      .update({ is_public: next })
      .eq('id', id)
      .select('*')
      .single();

    if (error) { console.error('toggleShare error', error); return; }

    setChats(prev => prev.map(c =>
      c.id === id
        ? { ...data, searchText: buildSearchText(data) }
        : c
    ));

    if (next && typeof window !== 'undefined') {
      const link = `${window.location.origin}/share/${data.public_id}`;
      try { await navigator.clipboard?.writeText(link); } catch {}
      alert(`Öffentlicher Link kopiert:\n${link}`);
    }
  }

  async function sendMessageStreaming(userText) {
    if (!activeChatId || !userText?.trim()) return;

    const current = chats.find(c => c.id === activeChatId);
    const isFirst = (current?.messages?.length ?? 0) === 0;

    const userMsg = { sender: 'Du', text: userText };
    const aiMsg = { sender: 'KI', text: '' };
    const draft = [...(current?.messages || []), userMsg, aiMsg];

    setLoading(true);
    // Optimistisches Update im State
    setChats(prev => prev.map(c =>
      c.id === activeChatId
        ? { ...c, messages: draft, searchText: buildSearchText({ ...c, messages: draft }) }
        : c
    ));

    if (isFirst) {
      // Titel „smart“ setzen – fire-and-forget
      generateTitleSmart(userText).then(async (t) => {
        const { data: upd, error } = await supabase
          .from('chats')
          .update({ title: t })
          .eq('id', activeChatId)
          .select('*')
          .single();

        if (!error && upd) {
          setChats(prev => prev.map(c =>
            c.id === activeChatId
              ? { ...upd, title: upd.title || 'Neuer Chat', messages: Array.isArray(upd.messages) ? upd.messages : [], searchText: buildSearchText(upd) }
              : c
          ));
        }
      });
    }

    // Streaming-History aufbauen
    const history = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...draft
        .filter(m => m.sender === 'Du' || (m.sender === 'KI' && m.text)) // KI nur mit Text
        .map(m => m.sender === 'Du'
          ? { role: 'user', content: m.text }
          : { role: 'assistant', content: m.text }
        )
    ];

    try {
      const res = await fetch('/api/chatStream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history })
      });
      if (!res.ok || !res.body) throw new Error('stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let full = '';

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
              full += delta;
              // letztes KI-Message während des Streams updaten
              setChats(prev => prev.map(c => {
                if (c.id !== activeChatId) return c;
                const msgs = [...(c.messages || [])];
                if (msgs.length) msgs[msgs.length - 1] = { sender: 'KI', text: full };
                return { ...c, messages: msgs, searchText: buildSearchText({ ...c, messages: msgs }) };
              }));
            }
          } catch {}
        }
      }

      // Final persistieren
      let finalMsgs;
      setChats(prev => prev.map(c => {
        if (c.id !== activeChatId) return c;
        const msgs = [...(c.messages || draft)];
        if (msgs.length) msgs[msgs.length - 1] = { sender: 'KI', text: (msgs[msgs.length - 1].text || full || ' ') };
        finalMsgs = msgs;
        return { ...c, messages: msgs, searchText: buildSearchText({ ...c, messages: msgs }) };
      }));

      await supabase
        .from('chats')
        .update({ messages: finalMsgs })
        .eq('id', activeChatId);

    } catch (e) {
      console.error('sendMessageStreaming error', e);
      // Fehlertext anzeigen
      setChats(prev => prev.map(c => {
        if (c.id !== activeChatId) return c;
        const msgs = [...(c.messages || [])];
        if (msgs.length) msgs[msgs.length - 1] = { sender: 'KI', text: 'Fehler bei KI' };
        return { ...c, messages: msgs, searchText: buildSearchText({ ...c, messages: msgs }) };
      }));
    }

    setLoading(false);
  }

  return {
    chats,
    activeChatId,
    setActiveChatId,
    activeMessages,
    loading,
    // actions
    newChat,
    renameChat,
    deleteChat,
    toggleShare,
    sendMessageStreaming
  };
}
