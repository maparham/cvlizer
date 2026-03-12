import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/** Build-time replacement for public URL in index.html (og:url). Set VITE_PUBLIC_URL per deployment. When unset, the og:url meta tag is omitted so no invalid placeholder or wrong domain is output. */
function replacePublicUrl() {
  const publicUrl = process.env.VITE_PUBLIC_URL
  const safeUrl = publicUrl ? publicUrl.replace(/\$/g, '$$') : null
  // Match horizontal whitespace only before/after tag so we don't consume adjacent lines or the next line's indentation
  const ogUrlTagRegex = /[ \t]*<meta property="og:url" content="__PUBLIC_URL__"\s*\/?>[ \t]*\r?\n?/g
  return {
    name: 'replace-public-url',
    apply: 'build',
    transformIndexHtml(html: string) {
      if (safeUrl == null) return html.replace(ogUrlTagRegex, '')
      return html.replace(/__PUBLIC_URL__/g, safeUrl)
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [replacePublicUrl(), react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['demo.maparham.eu'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers'],
          router: ['react-router-dom'],
          utils: ['axios', 'date-fns', 'zustand', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', '@mui/icons-material']
  }
})
