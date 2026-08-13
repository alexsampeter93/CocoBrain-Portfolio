import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb', '**/*.ktx2', '**/*.hdr'],
  server: {
    watch: {
      // Assets/ son los originales crudos: cientos de MB que el navegador
      // nunca carga. Vigilarlos revienta el watcher con EBUSY en Windows.
      ignored: ['**/Assets/**', '**/_docs/**'],
    },
  },
  build: {
    // Warn early if a chunk starts eating into the 4 MB initial-load budget
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
})
