// components/chats/ChatListItem.jsx
// Zweck: Eine Chat-Zeile in der Sidebar inkl. Hover-Ellipsis und ChatMenu.
// Props: chat, active, onSelect, onRename, onToggleShare, onDelete

import { useState } from 'react';
import C from '../../styles/tokens';
import ChatMenu from './ChatMenu';

export default function ChatListItem({
  chat, active,
  onSelect, onRename, onToggleShare, onDelete
}) {
  const [open, setOpen] = useState(false);

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    background: active ? '#0f1218' : 'transparent',
    color: active ? C.text : C.sub,
    border: `1px solid ${active ? C.accent + '33' : 'transparent'}`,
    padding: '12px 14px',
    borderRadius: 14,
    cursor: 'pointer',
    position: 'relative',
    transition: 'background .12s ease'
  };

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
    display: open ? 'inline-block' : 'none'
  };

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={(e)=> { const btn = e.currentTarget.querySelector('.dots'); if (btn) btn.style.display='inline-block'; }}
      onMouseLeave={(e)=> { if (!open) { const btn = e.currentTarget.querySelector('.dots'); if (btn) btn.style.display='none'; } }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect?.(chat.id)}
        onKeyDown={(e)=> { if (e.key === 'Enter') onSelect?.(chat.id); }}
        style={rowStyle}
      >
        <span style={{
          flex: 1, minWidth: 0, fontWeight: 640,
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
        }}>
          {chat.title || 'Neuer Chat'}
        </span>

        <button
          className="dots"
          aria-label="Menü"
          title="Menü"
          style={dotsBtn}
          onClick={(e) => { e.stopPropagation(); setOpen((v)=>!v); }}
        >
          <span style={{ fontSize: 18, position: 'relative', top: -1 }}>⋮</span>
        </button>
      </div>

      <ChatMenu
        open={open}
        onClose={() => setOpen(false)}
        onRename={() => { setOpen(false); onRename?.(chat.id); }}
        onToggleShare={() => { setOpen(false); onToggleShare?.(chat.id); }}
        onDelete={() => { setOpen(false); onDelete?.(chat.id); }}
        isPublic={!!chat.is_public}
      />
    </div>
  );
}
