// components/chat/ChatWindow.jsx
// Zweck: Hauptbereich – Header, Nachrichtenliste, InputBar.
// Props: messages (Array), loading (bool), onSend(text)

import { useRef, useEffect, useState } from 'react';
import C from '../../styles/tokens';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';
import { sidebarWidth } from '../layout/Sidebar';

export default function ChatWindow({ messages, loading, onSend }) {
  const endRef = useRef(null);
  const [text, setText] = useState('');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    onSend?.(text);
    setText('');
  }

  return (
  <main style={{
  position: 'relative',
  background: C.bg,
  minHeight: '100vh',
  width: `calc(100vw - ${sidebarWidth}px)`, // <— eigene Spaltenbreite
  marginLeft: sidebarWidth,                // <— neben die Sidebar setzen
  boxSizing: 'border-box',
  fontFamily: '"Inter","SF Pro Text","Segoe UI",system-ui,-apple-system,sans-serif',
  color: C.text,
  overflowX: 'hidden',
  zIndex: 1
}}>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, backdropFilter: 'saturate(120%) blur(6px)',
        background: C.bg, borderBottom: `1px solid ${C.border}`,
        padding: '16px 0', zIndex: 1
      }}>
        <div style={{ maxWidth: 860, width: '92vw', margin: '0 auto', padding: '0 20px' }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>KI-Chat</h1>
          <div style={{ marginTop: 4, fontSize: 13, color: C.muted }}>Frag mich irgendwas.</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ maxWidth: 860, width: '92vw', margin: '0 auto', padding: '18px 20px 26px' }}>
        <div style={{ minHeight: '56vh' }}>
          {(!messages || messages.length === 0) && !loading && (
            <div style={{ color: C.muted, textAlign: 'center', marginTop: '18vh', fontSize: 15 }}>
              Starte mit einer Frage – z. B. <em>„Erklär mir JSON in 2 Sätzen“</em>
            </div>
          )}

          {messages?.map((m, i) => {
            const role = m.sender === 'Du' ? 'user' : 'assistant';
            return (
              <div key={i} style={{
                display: 'flex',
                justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
                margin: '10px 0'
              }}>
                <MessageBubble role={role}>{m.text}</MessageBubble>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '10px 0' }}>
              <MessageBubble role="assistant"><i>Antwort kommt …</i></MessageBubble>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <InputBar value={text} onChange={setText} onSubmit={handleSubmit} disabled={loading} />
    </main>
  );
}
