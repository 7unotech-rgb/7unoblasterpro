import { defineConfig } from 'vite'
import react from '@vitejs/vite-plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist', // Memaksa output ke folder 'dist'
  },
  server: {
    port: 3000,
  }
})