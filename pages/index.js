// pages/index.js
// Zweck: Orchestrierung – verbindet Auth & Chats mit UI-Komponenten.
// Enthält globalen Stil-Reset und das Layout (Sidebar + ChatWindow).
// Hinweis: API-Routen (/api/chatStream, /api/generateTitle) + supabaseClient.js bleiben unverändert.

import useAuth from '../hooks/useAuth';
import useChats from '../hooks/useChats';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import AuthForm from '../AuthForm';
import C from '../styles/tokens';

export default function Home() {
  // ---------- AUTH ----------
  const user = useAuth();

  // ---------- CHATS (Hook mit allen Funktionen) ----------
  const {
    chats,
    activeChatId,
    setActiveChatId,
    activeMessages,
    loading,
    newChat,
    renameChat,
    deleteChat,
    toggleShare,
    sendMessageStreaming,
  } = useChats(user);

  // ---------- LOGIN SCREEN ----------
  if (!user) {
    return (
      <div
        style={{
          background: C.bg,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AuthForm />
      </div>
    );
  }

  // ---------- MAIN LAYOUT ----------
  return (
    <>
      <div
        style={{
          display: 'flex',
          width: '100vw',
          minHeight: '100vh',
          background: C.bg,
        }}
      >
        {/* --- SIDEBAR --- */}
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
          onNewChat={newChat}
          onRename={renameChat}
          onToggleShare={toggleShare}
          onDelete={deleteChat}
          userEmail={user?.email}
        />

        {/* --- CHATWINDOW --- */}
        <ChatWindow
          messages={activeMessages}
          loading={loading}
          onSend={sendMessageStreaming}
        />
      </div>

      {/* --- GLOBALER STIL-RESET --- */}
      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          background: ${C.bg};
          overflow-x: hidden;
          color-scheme: dark;
        }

        * {
          box-sizing: border-box;
        }

        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: ${C.border};
          border-radius: 10px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </>
  );
}
