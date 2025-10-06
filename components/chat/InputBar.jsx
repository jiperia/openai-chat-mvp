// components/chat/InputBar.jsx
// Zweck: Feste Eingabeleiste unten inkl. Senden-Button.
// Props: value, onChange, onSubmit, disabled

import C from '../../styles/tokens';

export default function InputBar({ value, onChange, onSubmit, disabled }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, background: `${C.bg}cc`,
      backdropFilter: 'saturate(120%) blur(6px)',
      borderTop: `1px solid ${C.border}`, padding: '16px 0'
    }}>
      <form onSubmit={onSubmit} style={{
        maxWidth: 740, width: '92vw', margin: '0 auto', display: 'flex', gap: 8
      }}>
        <input
          value={value}
          onChange={(e)=> onChange(e.target.value)}
          placeholder="Schreibe eine Nachricht…"
          disabled={disabled}
          style={{
            flex: 1, padding: '14px 16px', borderRadius: 12,
            border: `1px solid ${C.border}`, background: C.panel,
            color: C.text, fontSize: 16, outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          style={{
            background: C.accent, color: '#fff', border: 'none',
            padding: '12px 16px', borderRadius: 12, fontWeight: 700, fontSize: 14,
            opacity: (disabled || !value.trim()) ? 0.65 : 1,
            cursor: (disabled || !value.trim()) ? 'not-allowed' : 'pointer'
          }}
        >
          Senden
        </button>
      </form>
    </div>
  );
}
