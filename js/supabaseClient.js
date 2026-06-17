// Initializes the Supabase client as a global `sb` for use across the app.
// Requires the Supabase CDN script to be loaded first (see index.html).
const sb = supabase.createClient(
  "https://aknynshszfxxkspkokru.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbnluc2hzemZ4eGtzcGtva3J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjE3OTUsImV4cCI6MjA5NzI5Nzc5NX0.YjqkPMs_YU8ZXFwsPf36yXqq0BYoi5Y_KtbYOSnROa0"
);