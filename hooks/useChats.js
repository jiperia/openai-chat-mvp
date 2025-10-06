// hooks/useChats.js
// Zweck: Alle Chat-bezogenen Zustände & Aktionen kapseln (Laden, CRUD, Teilen, Streaming, Auto-Titel).
// Export: siehe Rückgabewerte unten.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { generateTitleSmart } from '../lib/title';

const SYSTEM_PROMPT = 'Du bist ein freundlicher, deutschsprachiger KI-Chatassistent.';

export default function useChats(user) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Laden
  useEffect(() => {
    if (!user) { setChats([]); setActiveChatId(null); return; }
    supabase.from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setChats(data || []);
        if (data?.length) setActiveChatId(data[0].id);
      });
  }, [user]);

  // Selektionen
  const activeMessages = useMemo(
    () => chats.find(c => c.id === activeChatId)?.messages || [],
    [chats, activeChatId]
  );

  // Aktionen
  async function newChat() {
    const { data, error } = await supabase
      .from('chats')
      .insert([{ title: 'Neuer Chat', messages: [], user_id: user.id }])
      .select()
      .single();
    if (error) throw error;
    setChats(prev => [data, ...prev]);
    setActiveChatId(data.id);
  }

  async function renameChat(id, title) {
    const name = (title ?? '').trim();
    if (!name) return;
    const { data } = await supabase.from('chats').update({ title: name }).eq('id', id).select().single();
    if (data) setChats(prev => prev.map(c => (c.id === id ? { ...c, title: name } : c)));
  }

  async function deleteChat(id) {
    await supabase.from('chats').delete().eq('id', id);
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) setActiveChatId(prev => (chats.find(c => c.id !== id)?.id ?? null));
  }

  async function toggleShare(id) {
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    const next = !chat.is_public;
    const { data } = await supabase.from('chats').update({ is_public: next }).eq('id', id).select().single();
    if (data) {
      setChats(prev => prev.map(c => (c.id === id ? { ...c, is_public: next } : c)));
      if (next && typeof window !== 'undefined') {
        const link = `${window.location.origin}/share/${chat.public_id}`;
        navigator.clipboard?.writeText(link).catch(() => {});
        alert(`Öffentlicher Link kopiert:\n${link}`);
      }
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
    setChats(prev => prev.map(c => (c.id === activeChatId ? { ...c, messages: draft } : c)));

    if (isFirst) {
      // Titel „smart“ setzen – Fire-and-forget (wird ins UI zurückgeschrieben)
      generateTitleSmart(userText).then(async (t) => {
        const { data: upd } = await supabase.from('chats').update({ title: t }).eq('id', activeChatId).select().single();
        if (upd) setChats(prev => prev.map(c => (c.id === activeChatId ? { ...c, title: t } : c)));
      });
    }

    const history = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...draft
        .filter(m => m.text !== '' || m.sender === 'KI')
        .map(m => (m.sender === 'Du' ? { role: 'user', content: m.text } : (m.text ? { role: 'assistant', content: m.text } : null)))
        .filter(Boolean)
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
              setChats(prev => prev.map(c => {
                if (c.id !== activeChatId) return c;
                const msgs = [...c.messages];
                msgs[msgs.length - 1] = { sender: 'KI', text: full };
                return { ...c, messages: msgs };
              }));
            }
          } catch {}
        }
      }

      // Final persistieren
      const finalMsgs = (() => {
        const latest = chats.find(c => c.id === activeChatId);
        const msgs = (latest?.messages || draft).map(m => ({ ...m }));
        msgs[msgs.length - 1] = { sender: 'KI', text: full || ' ' };
        return msgs;
      })();

      await supabase.from('chats').update({ messages: finalMsgs }).eq('id', activeChatId);
    } catch {
      // Fehlertext zeigen
      setChats(prev => prev.map(c => {
        if (c.id !== activeChatId) return c;
        const msgs = [...c.messages];
        msgs[msgs.length - 1] = { sender: 'KI', text: 'Fehler bei KI' };
        return { ...c, messages: msgs };
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
