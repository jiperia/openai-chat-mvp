// components/chats/ChatListItem.jsx
// Zweck: Eine Chat-Zeile in der Sidebar inkl. 3-Punkte-Menü.
// Fixes:
//  - Rename: Prompt im ListItem, ruft onRename(id, title) korrekt auf.
//  - Kein Layout-Shift: Ellipsis-Button absolut positioniert, keine Border,
//    Ein-/Ausblenden per Opacity (Hover) statt display: none.

import { useState } from 'react';
import C from '../../styles/tokens';
import ChatMenu from './ChatMenu';

export default function ChatListItem({
  chat,
  active,
  onSelect,
  onRename,
  onToggleShare,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);

  const rowStyle = {
    position: 'relative',
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
    transition: 'background .12s ease',
    minHeight: 44, // konstante Zeilenhöhe
  };

  // Ab hier: absoluter Ellipsis-Button → kein Einfluss auf Layout/Höhe
  const dotsBtn = {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: 8,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: C.sub,
    cursor: 'pointer',
    opacity: open || hover ? 1 : 0,        // weiches Ein-/Ausblenden
    transition: 'opacity .12s ease',
  };

  function handleRename() {
    const current = chat?.title || '';
    const name = window.prompt('Neuer Titel:', current);
    if (name && name.trim()) {
      onRename?.(chat.id, name.trim());
    }
  }

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect?.(chat.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSelect?.(chat.id);
        }}
        style={rowStyle}
        title={chat.title}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontWeight: 640,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            paddingRight: 36, // Raum, damit Text nicht unter die 3 Punkte läuft
          }}
        >
          {chat.title || 'Neuer Chat'}
        </span>

        <button
          aria-label="Menü"
          title="Menü"
          style={dotsBtn}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <span style={{ fontSize: 18, lineHeight: '28px', display: 'block' }}>⋮</span>
        </button>
      </div>

      <ChatMenu
        open={open}
        onClose={() => setOpen(false)}
        onRename={() => {
          setOpen(false);
          handleRename(); // prompt + onRename(id, title)
        }}
        onToggleShare={() => {
          setOpen(false);
          onToggleShare?.(chat.id);
        }}
        onDelete={() => {
          setOpen(false);
          onDelete?.(chat.id);
        }}
        isPublic={!!chat.is_public}
      />
    </div>
  );
}
