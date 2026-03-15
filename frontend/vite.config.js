import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Bind to all interfaces so LAN devices (tablet) can connect
    port: 5173,
    open: false,
  }
})
