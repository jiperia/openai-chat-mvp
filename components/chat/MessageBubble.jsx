// components/chat/MessageBubble.jsx
// Zweck: Eine Chat-Bubble für User/Assistant.
// Props: role ('user'|'assistant'), children (Textinhalt)

import C from '../../styles/tokens';

export default function MessageBubble({ role, children }) {
  const bubble = {
    maxWidth: '88%',
    padding: '12px 14px',
    borderRadius: 12,
    lineHeight: 1.6,
    fontSize: 16,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    background: role === 'user' ? C.panel : '#0f1218',
    border: `1px solid ${C.border}`,
    color: C.text
  };
  return <div style={bubble}>{children}</div>;
}
