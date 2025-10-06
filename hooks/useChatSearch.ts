import { useMemo, useState } from "react";

type Msg = { role?: string; content?: string };
type Chat = {
  id: string;
  title?: string;
  // optionale Felder – wir nehmen, was vorhanden ist:
  date?: string;
  updated_at?: string;
  created_at?: string;
  lastMessage?: string;
  preview?: string;
  snippet?: string;
  summary?: string;
  messages?: Msg[]; // wenn du Messages im Objekt hast, nutzen wir die letzten paar
};

function norm(s: any) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\s+/g, " ")
    .trim();
}

function buildHaystack(c: Chat) {
  // Titel + diverse mögliche Textfelder + (optional) die letzten 5 Messages
  const msgTail = (c.messages?.slice(-5) || [])
    .map((m) => m?.content || "")
    .join(" ");

  const hay = [
    c.title,
    c.lastMessage,
    c.preview,
    c.snippet,
    c.summary,
    msgTail,
  ]
    .filter(Boolean)
    .join(" ");

  return norm(hay);
}

function recencyScore(c: Chat) {
  const d =
    c.updated_at || c.date || c.created_at || new Date().toISOString();
  const t = new Date(d).getTime() || 0;
  // einfache Rangierung: jüngere Chats leicht bevorzugen
  return t / 1e11; // skaliert klein, damit Content-Treffer dominiert
}

export function useChatSearch(rawChats: Chat[]) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const chats = Array.isArray(rawChats) ? rawChats : [];
    const q = norm(query);
    if (!q) {
      // Standard: jüngste zuerst
      return chats
        .slice()
        .sort((a, b) => recencyScore(b) - recencyScore(a))
        .slice(0, 20);
    }

    const terms = q.split(" ").filter(Boolean);

    const scored = chats
      .map((c) => {
        const title = norm(c.title || "");
        const hay = buildHaystack(c);
        // Muss alle Terms enthalten (AND), sonst 0
        const allTermsPresent = terms.every((t) => hay.includes(t));
        if (!allTermsPresent) return null;

        // Score: Vorkommen im Titel ist mehr wert, sonst im Inhalt
        let score = 0;
        for (const t of terms) {
          const inTitle = title.includes(t) ? 2 : 0; // Titel doppelt gewichten
          // einfache Häufigkeitswertung im Inhalt
          const inBody = (hay.match(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")) || [])
            .length;
          score += inTitle + inBody;
        }
        score += recencyScore(c); // kleine Recency-Beigabe
        return { chat: c, score };
      })
      .filter(Boolean) as { chat: Chat; score: number }[];

    return scored
      .sort((a, b) => b.score - a.score)
      .map((s) => s.chat)
      .slice(0, 20);
  }, [query, rawChats]);

  return { query, setQuery, results };
}
