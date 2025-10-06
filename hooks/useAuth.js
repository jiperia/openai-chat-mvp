// hooks/useAuth.js
// Zweck: Supabase-User laden + auf Auth-Änderungen hören.
// Rückgabe: user (null | Supabase User)

import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  return user;
}
