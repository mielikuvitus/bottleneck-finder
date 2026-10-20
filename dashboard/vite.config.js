import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served from my domain at /monzo/dashboard/ (data and images load from
  // under it too, via import.meta.env.BASE_URL)
  base: '/monzo/dashboard/',
})
