// hooks/useChats.js
// Zweck: Alle Chat-Zustände & Aktionen (Laden, CRUD, Teilen, Streaming, Auto-Titel)

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
        .select('id,title,created_at,messages,is_public,public_id,user_id')
        .eq('user_id', user.id)                           // nur eigene Chats
        .order('created_at', { ascending: false });       // stabil sortieren

      if (cancelled) return;
      setLoading(false);

      if (error) {
        console.error('load chats error', error);
        setChats([]);
        setActiveChatId(null);
        return;
      }

      const mapped = (data || []).map(c => {
        const normalized = {
          ...c,
          title: c.title || 'Neuer Chat',
          messages: Array.isArray(c.messages) ? c.messages : [],
        };
        return { ...normalized, searchText: buildSearchText(normalized) };
      });

      // Debug: was kommt wirklich aus der DB?
      console.log('[useChats] loaded chats:', mapped.map(x => ({
        id: x.id, title: x.title, msgs: x.messages.length
      })));

      setChats(mapped);

      // Active nur setzen, wenn er leer ist ODER nicht mehr existiert
      if (!activeChatId || !mapped.some(c => c.id === activeChatId)) {
        if (mapped.length) setActiveChatId(mapped[0].id);
        else setActiveChatId(null);
      }
    })();

    return () => { cancelled = true; };
    // nur reagieren, wenn sich die UID ändert
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ---------- Abgeleitete Werte ----------
  const activeMessages = useMemo(
    () => chats.find(c => c.id === activeChatId)?.messages || [],
    [chats, activeChatId]
  );

  // ---------- Hilfsfunktion: harter Refresh aus DB ----------
  async function refreshChats() {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('chats')
      .select('id,title,created_at,messages,is_public,public_id,user_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) { console.warn('refreshChats error', error); return; }

    const mapped = (data || []).map(c => {
      const normalized = {
        ...c,
        title: c.title || 'Neuer Chat',
        messages: Array.isArray(c.messages) ? c.messages : [],
      };
      return { ...normalized, searchText: buildSearchText(normalized) };
    });

    setChats(mapped);
    if (!activeChatId || !mapped.some(c => c.id === activeChatId)) {
      setActiveChatId(mapped[0]?.id ?? null);
    }
  }

  // ---------- Aktionen ----------
  async function newChat() {
    if (!user?.id) return;

    const payload = { title: 'Neuer Chat', messages: [], user_id: user.id };
    const { data, error } = await supabase
      .from('chats')
      .insert(payload)
      .select('id,title,created_at,messages,is_public,public_id,user_id')
      .single();

    if (error) { console.error('newChat error', error); return; }

    const created = {
      ...data,
      title: data.title || 'Neuer Chat',
      messages: Array.isArray(data.messages) ? data.messages : [],
    };
    created.searchText = buildSearchText(created);

    setChats(prev => [created, ...prev]);
    setActiveChatId(created.id);

    // Safety: einmal nachziehen, was wirklich in der DB steht
    await refreshChats();
  }

  async function renameChat(id, title) {
    const name = (title ?? '').trim();
    if (!name || !user?.id) return;

    const { data, error } = await supabase
      .from('chats')
      .update({ title: name })
      .eq('id', id)
      .eq('user_id', user.id) // RLS-freundlich
      .select('id,title,created_at,messages,is_public,public_id,user_id')
      .single();

    if (error) { console.error('renameChat error', error); return; }

    const updated = {
      ...data,
      title: data.title || 'Neuer Chat',
      messages: Array.isArray(data.messages) ? data.messages : [],
    };
    updated.searchText = buildSearchText(updated);

    setChats(prev => prev.map(c => (c.id === id ? updated : c)));
    await refreshChats();
  }

  async function deleteChat(id) {
    if (!user?.id) return;

    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) { console.error('deleteChat error', error); return; }

    setChats(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
      return filtered;
    });
    await refreshChats();
  }

  // Teilen nur, wenn Spalten existieren (MVP-Guard)
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
      .eq('user_id', user.id)
      .select('id,title,created_at,messages,is_public,public_id,user_id')
      .single();

    if (error) { console.error('toggleShare error', error); return; }

    const updated = { ...data };
    updated.searchText = buildSearchText(updated);
    setChats(prev => prev.map(c => (c.id === id ? updated : c)));

    if (next && typeof window !== 'undefined') {
      const origin = window.location?.origin || '';
      const link = `${origin}/share/${data.public_id}`;
      try { await navigator.clipboard?.writeText(link); } catch {}
      alert(`Öffentlicher Link kopiert:\n${link}`);
    }
  }

  async function sendMessageStreaming(userText) {
    if (!activeChatId || !userText?.trim() || !user?.id) return;

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
          .eq('user_id', user.id)
          .select('id,title,created_at,messages,is_public,public_id,user_id')
          .single();

        if (!error && upd) {
          const normalized = {
            ...upd,
            title: upd.title || 'Neuer Chat',
            messages: Array.isArray(upd.messages) ? upd.messages : [],
          };
          normalized.searchText = buildSearchText(normalized);
          setChats(prev => prev.map(c => (c.id === activeChatId ? normalized : c)));
        }
      });
    }

    // Streaming-History aufbauen
    const history = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...draft
        .filter(m => m.sender === 'Du' || (m.sender === 'KI' && m.text))
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
        .eq('id', activeChatId)
        .eq('user_id', user.id);

      // Nach Persist: frische Wahrheit laden
      await refreshChats();

    } catch (e) {
      console.error('sendMessageStreaming error', e);
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
    sendMessageStreaming,
    refreshChats,
  };
}
