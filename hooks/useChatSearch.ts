// hooks/useChatSearch.ts
import { useMemo, useState } from "react";

type Chat = {
  id: string;
  title?: string;
  updated_at?: string;
  created_at?: string;
  messages?: { text?: string }[];
  // von useChats vorbereitet:
  searchText?: string;
};

function norm(s: any) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\s+/g, " ")
    .trim();
}

function haystack(c: Chat) {
  if (c.searchText) return norm(c.searchText);
  const title = c.title || "";
  const tail = Array.isArray(c.messages)
    ? c.messages.slice(-8).map(m => m?.text || "").join(" ")
    : "";
  return norm(`${title} ${tail}`);
}

function recency(c: Chat) {
  const d = c.updated_at || c.created_at || "";
  const t = d ? new Date(d).getTime() : 0;
  return t / 1e11;
}

export function useChatSearch(rawChats: Chat[]) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const chats = Array.isArray(rawChats) ? rawChats : [];
    const q = norm(query);

    if (!q) {
      return chats
        .slice()
        .sort((a, b) => recency(b) - recency(a))
        .slice(0, 20);
    }

    const terms = q.split(" ").filter(Boolean);

    return chats
      .map((c) => {
        const hs = haystack(c);
        if (!terms.every((t) => hs.includes(t))) return null;
        // Titeltreffer etwas höher, sonst Recency
        const inTitle = norm(c.title).includes(q) ? 2 : 0;
        return { chat: c, score: inTitle + recency(c) };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.chat)
      .slice(0, 20);
  }, [query, rawChats]);

  return { query, setQuery, results };
}
