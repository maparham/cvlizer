import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'

/** Build-time replacement for public URL in index.html (og:url) and sitemap.xml. Set VITE_PUBLIC_URL per deployment. When unset, the og:url meta tag and sitemap are omitted. */
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
    writeBundle: {
      order: 'post',
      handler() {
        const publicSitemap = resolve(process.cwd(), 'public', 'sitemap.xml')
        const distSitemap = resolve(process.cwd(), 'dist', 'sitemap.xml')
        if (!existsSync(publicSitemap)) return
        if (publicUrl == null || publicUrl === '') {
          if (existsSync(distSitemap)) unlinkSync(distSitemap)
          return
        }
        const content = readFileSync(publicSitemap, 'utf8').split('__PUBLIC_URL__').join(publicUrl)
        writeFileSync(distSitemap, content)
      },
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
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
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
