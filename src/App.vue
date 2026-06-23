<template>
  <div class="app-root">
    <div class="app" :class="appClasses">
      <Sidebar />
      <FilePanel ref="filePanelRef" />
      <ContentPanel />
    </div>
    <ContextMenu />
    <BlockMenu />
    <LockOverlay />
    <Toast />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { listen } from '@tauri-apps/api/event'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { getMatches } from '@tauri-apps/plugin-cli'
import Sidebar from './components/Sidebar.vue'
import FilePanel from './components/FilePanel.vue'
import ContentPanel from './components/ContentPanel.vue'
import ContextMenu from './components/ContextMenu.vue'
import BlockMenu from './components/BlockMenu.vue'
import LockOverlay from './components/LockOverlay.vue'
import Toast from './components/Toast.vue'
import { store, addCategory, selectCategory, addFile, selectFile, showToast } from './stores/useStore.js'

const filePanelRef = ref(null)

const appClasses = computed(() => ({
  'sidebar-collapsed': store.sidebarCollapsed,
  'filepanel-collapsed': store.filePanelCollapsed
}))

async function openFileFromPath(path) {
  try {
    const fileName = path.split(/[\\/]/).pop()
    const text = await readTextFile(path)
    
    const newFile = addFile()
    if (newFile) {
      newFile.name = fileName // Keep the extension for syntax highlighting
      if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
        newFile.type = 'markdown'
        delete newFile.blocks
        newFile.content = text
      } else if (fileName.endsWith('.txt')) {
        newFile.type = 'text'
        newFile.blocks = [{
          id: 'b' + Date.now() + Math.random(),
          title: '导入内容',
          collapsed: false,
          starred: false,
          order: 0,
          items: [{ id: 'i' + Date.now() + Math.random(), label: '', text: text, type: 'text' }]
        }]
      } else {
        newFile.type = 'code'
        delete newFile.blocks
        newFile.content = text
      }
      selectFile(newFile.id)
    }
  } catch (err) {
    console.error('Failed to open file from path:', err)
  }
}

// Supported file extensions for drag-drop import
const SUPPORTED_EXTS = ['.md', '.txt', '.html', '.htm', '.json', '.xml', '.log', '.yaml', '.yml', '.js', '.ts', '.py', '.vue']
function isSupportedFile(name) {
  return SUPPORTED_EXTS.some(ext => name.toLowerCase().endsWith(ext))
}

// Import a single file (by HTML5 File object) into the current category
async function importDroppedFile(file, displayName) {
  const name = displayName || file.name
  if (!isSupportedFile(name)) return false
  try {
    const text = await file.text()
    const newFile = addFile()
    if (!newFile) return false
    newFile.name = name
    if (name.endsWith('.md') || name.endsWith('.markdown')) {
      newFile.type = 'markdown'; delete newFile.blocks; newFile.content = text
    } else if (name.endsWith('.txt')) {
      newFile.type = 'text'
      newFile.blocks = [{ id: 'b' + Date.now() + Math.random(), title: '导入内容', collapsed: false, starred: false, order: 0, items: [{ id: 'i' + Date.now() + Math.random(), label: '', text, type: 'text' }] }]
    } else {
      newFile.type = 'code'; delete newFile.blocks; newFile.content = text
    }
    return true
  } catch (err) { console.error('[Drop] Failed to import file:', name, err); return false }
}

// Collect files from a FileSystemDirectoryEntry (two levels deep)
function collectFromDirectoryEntry(dirEntry, path, maxDepth, collected) {
  return new Promise((resolve) => {
    const reader = dirEntry.createReader()
    reader.readEntries(async (entries) => {
      for (const entry of entries) {
        if (entry.isFile) {
          const file = await new Promise(r => entry.file(r))
          collected.push({ file, path: path ? path + '/' + entry.name : entry.name })
        } else if (entry.isDirectory && maxDepth > 0) {
          await collectFromDirectoryEntry(entry, path ? path + '/' + entry.name : entry.name, maxDepth - 1, collected)
        }
      }
      resolve()
    }, () => resolve())
  })
}

onMounted(async () => {
  // Check CLI arguments for files opened externally
  try {
    const matches = await getMatches()
    if (matches.args && matches.args.file && matches.args.file.value) {
      await openFileFromPath(matches.args.file.value)
    }
  } catch (err) {
    console.error('Failed to parse CLI arguments:', err)
  }

  // Listen for single instance event (when user double-clicks another .md file while app is running)
  listen('single-instance', async (event) => {
    const args = event.payload
    if (args && args.length > 1) {
      const filePath = args[args.length - 1]
      if (filePath && !filePath.startsWith('--') && (filePath.includes('\\') || filePath.includes('/'))) {
        await openFileFromPath(filePath)
      }
    }
  })

  // Listen for Tauri's native drop event to capture absolute paths
  let lastTauriDroppedPaths = []
  listen('tauri://drag-drop', (event) => {
    if (event.payload?.paths) {
      lastTauriDroppedPaths = event.payload.paths
    } else if (Array.isArray(event.payload)) {
      lastTauriDroppedPaths = event.payload
    }
  })
  listen('tauri://file-drop', (event) => {
    if (event.payload?.paths) {
      lastTauriDroppedPaths = event.payload.paths
    } else if (Array.isArray(event.payload)) {
      lastTauriDroppedPaths = event.payload
    }
  })

  // HTML5 drop handler for external files/folders (works in both browser and Tauri)
  // Internal drag-drop (category/file reordering) is handled by Sidebar.vue / FilePanel.vue
  // via @drop.prevent.stop which stops propagation, so this handler only fires for external drops.
  window.addEventListener('drop', async (e) => {
    // Skip if no files (internal drag from our components won't have Files type)
    if (!e.dataTransfer?.files?.length) return

    const items = Array.from(e.dataTransfer.items || [])
    const entries = items.map(i => i.webkitGetAsEntry?.()).filter(Boolean)

    let importedCount = 0
    for (const entry of entries) {
      if (entry.isFile) {
        const file = await new Promise(r => entry.file(r))
        if (await importDroppedFile(file)) importedCount++
      } else if (entry.isDirectory) {
        // Read root + one level of subdirectories
        const folderName = entry.name || 'Imported Folder'
        const cat = addCategory()
        cat.name = folderName
        
        // Track original path if available (Tauri drag-drop sets .path on the File objects)
        let folderPath = ''
        if (lastTauriDroppedPaths && lastTauriDroppedPaths.length > 0) {
          const matchedPath = lastTauriDroppedPaths.find(p => 
            p.endsWith(entry.name) || p.endsWith(entry.name + '/') || p.endsWith(entry.name + '\\')
          )
          if (matchedPath) folderPath = matchedPath
        }
        if (!folderPath && e.dataTransfer?.files) {
          for (let i = 0; i < e.dataTransfer.files.length; i++) {
            const f = e.dataTransfer.files[i]
            if (f.name === entry.name && f.path) {
              folderPath = f.path; break
            }
          }
        }
        if (folderPath) cat.sourcePath = folderPath
        
        selectCategory(cat.id)
        const collected = []
        await collectFromDirectoryEntry(entry, '', 1, collected)
        for (const { file, path: filePath } of collected) {
          if (await importDroppedFile(file, filePath)) importedCount++
        }
      }
    }

    if (importedCount > 0) {
      showToast(`已成功导入 ${importedCount} 个文件`)
    } else if (e.dataTransfer?.files?.length > 0) {
      showToast('没有找到支持的文件格式')
    }
  }, true)

  // Listen for refresh folder requests
  window.addEventListener('quill-refresh-folder', async (e) => {
    const { id, mode } = e.detail
    const cat = store.categories.find(c => c.id === id)
    if (!cat || !cat.sourcePath) return
    
    try {
      const { readDir, readTextFile } = await import('@tauri-apps/plugin-fs')
      const { join } = await import('@tauri-apps/api/path')
      
      if (mode === 'refresh-overwrite') {
        store.files[cat.id] = []
      }
      
      let importedCount = 0
      
      async function collectTauriDir(dirPath, relPath, maxDepth) {
        const entries = await readDir(dirPath)
        for (const entry of entries) {
          const entryRelPath = relPath ? relPath + '/' + entry.name : entry.name
          const entryAbsPath = await join(dirPath, entry.name)
          if (entry.isFile && isSupportedFile(entry.name)) {
            if (mode === 'refresh-add') {
              const existing = (store.files[cat.id] || []).find(f => f.name === entry.name || f.name === entryRelPath)
              if (existing) continue
            }
            try {
              const text = await readTextFile(entryAbsPath)
              selectCategory(cat.id)
              const newFile = addFile()
              if (!newFile) continue
              newFile.name = entryRelPath
              if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown')) {
                newFile.type = 'markdown'; delete newFile.blocks; newFile.content = text
              } else if (entry.name.endsWith('.txt')) {
                newFile.type = 'text'
                newFile.blocks = [{ id: 'b' + Date.now() + Math.random(), title: '导入内容', collapsed: false, starred: false, order: 0, items: [{ id: 'i' + Date.now() + Math.random(), label: '', text, type: 'text' }] }]
              } else {
                newFile.type = 'code'; delete newFile.blocks; newFile.content = text
              }
              importedCount++
            } catch (err) { console.error('Failed to read', entryAbsPath, err) }
          } else if (entry.isDirectory && maxDepth > 0) {
            await collectTauriDir(entryAbsPath, entryRelPath, maxDepth - 1)
          }
        }
      }
      
      await collectTauriDir(cat.sourcePath, '', 1)
      showToast(`文件夹刷新完毕，新增 ${importedCount} 个文件`)
    } catch (err) {
      console.error('Refresh folder failed:', err)
      showToast('刷新文件夹失败: ' + err.message)
    }
  })

  // Prevent default dragover so external file drops are accepted
  window.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault()
  }, true)
})
</script>

<style>
.app-root { height: 100vh; width: 100vw; overflow: hidden; }
.app {
  display: grid;
  grid-template-columns: 220px 260px 1fr;
  height: 100vh;
  width: 100vw;
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.app.sidebar-collapsed { grid-template-columns: 52px 260px 1fr; }
.app.filepanel-collapsed { grid-template-columns: 220px 0px 1fr; }
.app.sidebar-collapsed.filepanel-collapsed { grid-template-columns: 52px 0px 1fr; }
</style>
