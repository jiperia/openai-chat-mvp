// pages/index.js
import { useEffect } from 'react';
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

  // ---------- GLOBALES EVENT HANDLING (z. B. von Sidebar oder Suche) ----------
  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.id;
      if (!id) return;
      // hier definieren wir, was passiert, wenn Sidebar ein Chat-Event sendet
      setActiveChatId(id);
    };

    window.addEventListener('open-chat', handler);
    return () => window.removeEventListener('open-chat', handler);
  }, [setActiveChatId]);

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
