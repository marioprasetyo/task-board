import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Expose VITE_ vars (Vite default) and NEXT_PUBLIC_ vars (Supabase-Vercel
  // integration) to the client bundle. Do NOT add a SUPABASE_ prefix here:
  // that would also expose SUPABASE_SERVICE_ROLE_KEY to the browser if
  // Vercel has it set, and the service_role key must never ship in client
  // code. Only the publishable / anon key belongs in the browser.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
})
