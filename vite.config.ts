import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/graphql':      'http://localhost:4000',
      '/upload':       'http://localhost:4000',
      '/uploads':      'http://localhost:4000',
      '/analytics':    'http://localhost:4000',
      '/theme':        'http://localhost:4000',
      '/teacher-help': 'http://localhost:4000',
    },
  },
})
