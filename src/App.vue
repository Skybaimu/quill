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
import { computed, ref, onMounted } from 'vue'
import { listen } from '@tauri-apps/api/event'
import { stat, readDir, readTextFile } from '@tauri-apps/plugin-fs'
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
    // The arguments are usually: [ "path/to/quill.exe", "path/to/file.md" ]
    if (args && args.length > 1) {
      const filePath = args[args.length - 1]
      // Quick check if it looks like a file path
      if (filePath && !filePath.startsWith('--') && (filePath.includes('\\') || filePath.includes('/'))) {
        await openFileFromPath(filePath)
      }
    }
  })

  // Listen for native file drops via Tauri
  listen('tauri://drag-drop', async (event) => {
    const paths = event.payload.paths
    if (!paths || paths.length === 0) return

    let importedCount = 0

    for (const path of paths) {
      try {
        const fileStat = await stat(path)

        if (fileStat.isDirectory) {
          // Handle folder — read two levels: root + immediate subfolders
          const folderName = path.split(/[\\/]/).pop() || 'Imported Folder'
          const cat = addCategory()
          cat.name = folderName
          selectCategory(cat.id)

          // Supported file extensions
          const supportedExts = ['.md', '.txt', '.html', '.htm', '.json', '.xml', '.log', '.yaml', '.yml', '.js', '.ts', '.py', '.vue']

          function isSupportedFile(name) {
            return supportedExts.some(ext => name.endsWith(ext))
          }

          // Import a single file into the current category
          async function importFile(filePath, fileName) {
            const text = await readTextFile(filePath)
            const newFile = addFile()
            if (newFile) {
              newFile.name = fileName
              if (fileName.endsWith('.md')) {
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
              importedCount++
            }
          }

          // Read root directory
          const entries = await readDir(path)
          for (const entry of entries) {
            if (entry.isFile && isSupportedFile(entry.name)) {
              try {
                await importFile(`${path}/${entry.name}`, entry.name)
              } catch (err) {
                console.error(`Failed to read file ${entry.name}:`, err)
              }
            } else if (entry.isDirectory) {
              // Read one level of subdirectories (depth=2, no further recursion)
              try {
                const subEntries = await readDir(`${path}/${entry.name}`)
                for (const subEntry of subEntries) {
                  if (subEntry.isFile && isSupportedFile(subEntry.name)) {
                    try {
                      // Prefix with subfolder name to avoid collisions
                      await importFile(`${path}/${entry.name}/${subEntry.name}`, `${entry.name}/${subEntry.name}`)
                    } catch (err) {
                      console.error(`Failed to read subfile ${entry.name}/${subEntry.name}:`, err)
                    }
                  }
                }
              } catch (err) {
                console.error(`Failed to read subfolder ${entry.name}:`, err)
              }
            }
          }
        } else if (fileStat.isFile) {
          // Handle single file
          const fileName = path.split(/[\\/]/).pop()
          if (fileName.endsWith('.md') || fileName.endsWith('.txt') || fileName.endsWith('.html') || fileName.endsWith('.htm') || fileName.endsWith('.json') || fileName.endsWith('.xml') || fileName.endsWith('.log') || fileName.endsWith('.yaml') || fileName.endsWith('.yml') || fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.py') || fileName.endsWith('.vue')) {
            const text = await readTextFile(path)
            const newFile = addFile()
            if (newFile) {
              newFile.name = fileName // Keep extension
              if (fileName.endsWith('.md')) {
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
              importedCount++
            }
          }
        }
      } catch (err) {
        console.error('Failed to handle drop path:', path, err)
      }
    }

    if (importedCount > 0) {
      showToast(`已成功导入 ${importedCount} 个文件`)
    } else {
      showToast('没有找到支持的文件格式')
    }
  })
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
