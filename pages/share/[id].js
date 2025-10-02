import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function PublicShare({ }) {
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select('title, messages, is_public')
        .eq('public_id', id)
        .eq('is_public', true)
        .single();
      setChat(error ? null : data);
      setLoading(false);
    }
    load();
  }, []);

  const C = {
    bg: "#0e0f13", panel: "#111319", border: "#1f2330", text: "#e7e9ee", muted: "#8b91a1"
  };

  if (loading) return <div style={{ color: '#ccc', padding: 24 }}>Lädt…</div>;
  if (!chat) return <div style={{ color: '#ccc', padding: 24 }}>Nicht gefunden oder nicht öffentlich.</div>;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ marginTop: 8 }}>{chat.title}</h1>
        <div style={{ marginTop: 24, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          {chat.messages?.map((m, i) => (
            <div key={i} style={{ margin: '12px 0', display: 'flex', justifyContent: m.sender === 'Du' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                background: m.sender === 'Du' ? C.panel : '#0f1218',
                border: `1px solid ${C.border}`, borderRadius: 12,
                padding: '12px 14px', maxWidth: '75%', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
              }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, color: C.muted, fontSize: 12 }}>
          Öffentliche Ansicht • Änderungen am Original sind hier nicht möglich.
        </div>
      </div>
    </div>
  );
}
