import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, './src/components'),
      '@context': path.resolve(__dirname, './src/context'),
      '@mock-data': path.resolve(__dirname, './src/mock-data'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    // Proxy API requests to Flask backend during development
    proxy: {
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/run-details': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/ask': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
