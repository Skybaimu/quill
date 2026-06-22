import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

function copyVditorPlugin() {
  return {
    name: 'copy-vditor',
    buildStart() {
      const src = path.resolve(__dirname, 'node_modules/vditor/dist')
      const dest = path.resolve(__dirname, 'public/vditor/dist')
      if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true, force: true })
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    copyVditorPlugin()
  ],
})
