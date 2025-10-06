import { useMemo, useState } from "react";

export function useChatSearch(chats: { id: string; title: string; date?: string }[]) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats.slice(0, 10);
    return chats
      .filter(c => c.title.toLowerCase().includes(q))
      .sort((a,b)=> (b.date||"").localeCompare(a.date||""))
      .slice(0, 20);
  }, [query, chats]);
  return { query, setQuery, results };
}
