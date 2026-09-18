import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // The dev server (esbuild) auto-shims process.env.NODE_ENV for pre-bundled deps like
  // react-router-dom, but the production build (Rollup) doesn't unless told to - without
  // this, `process` doesn't exist at all in the browser and the build crashes at runtime
  // with "process is not defined" the moment such a dep reads process.env.* client-side.
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
    'process.env': '{}',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}))
