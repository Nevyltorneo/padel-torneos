import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cbsfgbucnpujogxwvpim.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNic2ZnYnVjbnB1am9neHd2cGltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NjA2ODMsImV4cCI6MjA3MjMzNjY4M30.OKpeyasfs7qRdesqeMyq82zLewZXBfzupJEcYAg6Hdc";

// Cliente principal para uso en componentes del cliente
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
