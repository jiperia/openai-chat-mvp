import { createClient } from '@supabase/supabase-js';

// Hier DEINE echten Werte eintragen!
const SUPABASE_URL = "https://kxyambnweumzcrhubkvd.supabase.co"; // Deine Supabase-Projekt-URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4eWFtYm53ZXVtemNyaHVia3ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MTYxMjgsImV4cCI6MjA3NDQ5MjEyOH0.8z_2_A-t0THsoT8j0qv1nfUFMEXgzeyJrUtUMMAPq8c"; // Dein Public API Key (anon), aus Dashboard/API

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
