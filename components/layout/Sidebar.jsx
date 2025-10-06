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
      padding: '22px 14px',
      borderRight: `1px solid ${C.border}`,
      position: 'fixed',
      left: 0, top: 0,
      zIndex: 3,
      overflow: 'hidden'            // <— wichtig: nur die Liste scrollt
    }}>
      {/* Brand */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 10px', marginBottom: 8, fontWeight: 700, fontSize: 14, color: C.text
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: C.accent, display: 'inline-block' }} />
        <span>Jiperia</span><span style={{ color: C.muted, fontWeight: 600, marginLeft: 6 }}>MVP</span>
      </div>

      {/* New chat */}
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


{/* Spacer: Abstand zwischen Button und Chatliste */}
<div style={{ flexGrow: 1, height: '40vh' }} />


      
      {/* Section label */}
      <div style={{ marginTop: 16, color: C.muted, fontWeight: 600, fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase' }}>
        Chats
      </div>

      {/* Scroll-Liste */}
      <div style={{
        flex: 1, minHeight: 0, marginTop: 8, paddingRight: 4,
        display: 'flex', flexDirection: 'column', gap: 8,
        overflowY: 'auto'           // <— nur hier scrollen
      }}>
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

      {/* Footer immer sichtbar */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        paddingTop: 10, marginTop: 10,
        fontSize: 12, color: C.muted
      }}>
        Eingeloggt als<br />
        <span style={{ fontWeight: 600, color: C.sub }}>{userEmail || '—'}</span>
      </div>
    </aside>
  );
}

