import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Vite injects CSS after the module script; load styles before JS runs to avoid FOUC. */
function stylesheetBeforeScript(): Plugin {
  return {
    name: 'stylesheet-before-script',
    enforce: 'post',
    transformIndexHtml(html) {
      const sheets: string[] = []
      const withoutSheets = html.replace(
        /<link rel="stylesheet"[^>]*>\s*/g,
        (tag) => {
          sheets.push(tag.trim())
          return ''
        },
      )
      if (sheets.length === 0) return html
      const block = sheets.join('\n    ')
      return withoutSheets.replace(
        /(<script type="module")/,
        `${block}\n    $1`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), stylesheetBeforeScript()],
  envPrefix: 'SUPABASE_',
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
