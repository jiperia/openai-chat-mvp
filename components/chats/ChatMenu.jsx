// components/chats/ChatMenu.jsx
// Zweck: 3-Punkte-Popover mit Caret; Aktionen: Umbenennen, Teilen, Löschen.
// Props: open, onClose, anchorRight, onRename, onToggleShare, onDelete, isPublic

import C from '../../styles/tokens';
import useOutsideClick from '../../hooks/useOutsideClick';

export default function ChatMenu({
  open,
  onClose,
  anchorRight = 10,
  onRename,
  onToggleShare,
  onDelete,
  isPublic
}) {
  const ref = useOutsideClick(onClose, open);

  if (!open) return null;
  return (
    <>
      {/* Caret */}
      <div style={{
        position: 'absolute', right: anchorRight + 8, top: 36, width: 0, height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderBottom: `10px solid #171a21`,
        filter: 'drop-shadow(0 -1px 0 ' + C.border + ')'
      }} />
      {/* Card */}
      <div ref={ref} style={{
        position: 'absolute',
        right: anchorRight,
        top: 46,
        background: '#171a21',
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        boxShadow: '0 18px 50px rgba(0,0,0,.5)',
        overflow: 'hidden',
        zIndex: 20,
        minWidth: 260
      }}>
        <MenuRow onClick={onToggleShare}>
          <LinkIcon color={isPublic ? C.green : C.text} />
          <span style={{ color: isPublic ? C.green : C.text }}>
            {isPublic ? 'Link teilen (aktiv)' : 'Teilen aktivieren'}
          </span>
        </MenuRow>
        <Divider />
        <MenuRow onClick={onRename}>
          <PenIcon />
          <span>Umbenennen</span>
        </MenuRow>
        <Divider />
        <MenuRow onClick={onDelete} danger>
          <TrashIcon />
          <span>Löschen</span>
        </MenuRow>
      </div>
    </>
  );
}

function MenuRow({ children, onClick, danger }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        background: 'transparent',
        border: 'none',
        color: danger ? C.red : C.text,
        cursor: 'pointer',
        fontSize: 14
      }}
      onMouseEnter={(e)=> e.currentTarget.style.background = C.panelHover}
      onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </button>
  );
}

const Divider = () => <div style={{ height: 1, background: C.border, opacity: .7 }} />;

const PenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M4 21h4l11-11a2.828 2.828 0 10-4-4L4 17v4z"
      stroke={C.text} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m1 0-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"
      stroke={C.red} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LinkIcon = ({ color = C.text }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M15 8a3 3 0 1 0-2.83-4h0L7 9m2 6 5.17 5a3 3 0 1 0 2.83-4"
      stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
