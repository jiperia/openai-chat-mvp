// components/layout/Sidebar.jsx
// Zweck: Linke Spalte – Marke, Neuer-Chat-Button, Archivliste.
// Props: chats, activeChatId, onSelectChat, onNewChat, onRename, onToggleShare, onDelete

import C from '../../styles/tokens';
import ChatListItem from '../chats/ChatListItem';

const SIDEBAR_W = 320;
export const sidebarWidth = SIDEBAR_W;

export default function Sidebar({
  chats, activeChatId, onSelectChat, onNewChat,
  onRename, onToggleShare, onDelete, userEmail
}) {
  return (
    <aside style={{
      width: SIDEBAR_W,
      background: C.panel,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: '22px 14px',
      borderRight: `1px solid ${C.border}`,
      position: 'fixed',
      left: 0, top: 0,
      zIndex: 3
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 10px', marginBottom: 6, fontWeight: 700, fontSize: 14, color: C.text
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: C.accent, display: 'inline-block' }} />
        <span>Jiperia</span><span style={{ color: C.muted, fontWeight: 600, marginLeft: 6 }}>MVP</span>
      </div>

      <button
        style={{
          background: C.panelHover, color: C.text, border: `1px solid ${C.border}`,
          padding: '12px 14px', borderRadius: 14, fontWeight: 600, fontSize: 14,
          textAlign: 'left', cursor: 'pointer'
        }}
        onClick={onNewChat}
      >
        + Neuer Chat
      </button>

      <div style={{ height: '22vh' }} />

      <div style={{ marginTop: 4, color: C.muted, fontWeight: 600, fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase' }}>
        Chats
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, paddingRight: 4, overflowY: 'auto' }}>
        {chats.map(chat => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            active={chat.id === activeChatId}
            onSelect={onSelectChat}
            onRename={onRename}
            onToggleShare={onToggleShare}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 12, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
        Eingeloggt als<br /><span style={{ fontWeight: 600, color: C.sub }}>{userEmail}</span>
      </div>
    </aside>
  );
}
