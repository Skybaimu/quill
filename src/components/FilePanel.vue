<template>
  <div class="file-panel" :class="{ hidden: store.filePanelCollapsed }">
    <div class="file-panel-header">
      <div class="file-panel-top">
        <div class="file-panel-title">
          {{ currentCatName }}
        </div>
        <div class="file-panel-actions">
          <button class="icon-btn" @click="handleAddFile" title="新建文件">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
          <button class="icon-btn" @click="store.filePanelCollapsed = true" title="收起文件列表">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 搜索栏：scope 下拉 + 输入框 + 搜索图标 -->
      <div class="search-bar">
        <div class="search-scope-trigger" @click.stop="scopeOpen = !scopeOpen">
          <span class="scope-label">{{ currentScopeLabel }}</span>
          <svg class="scope-arrow" :class="{ open: scopeOpen }" width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        <div class="search-scope-dropdown" v-if="scopeOpen">
          <div
            v-for="scope in scopes"
            :key="scope.key"
            class="scope-option"
            :class="{ active: store.searchScope === scope.key }"
            @click="store.searchScope = scope.key; scopeOpen = false"
          >{{ scope.label }}</div>
        </div>
        <input
          type="text"
          class="search-input"
          placeholder="搜索..."
          v-model="store.searchQuery"
          @keydown.escape="store.searchQuery = ''"
          @focus="scopeOpen = false"
        />
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <button v-if="store.searchQuery" class="search-clear" @click="store.searchQuery = ''">
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="file-list" @click="scopeOpen = false">
      <div
        v-for="file in filteredFiles"
        :key="file.id"
        class="file-item"
        :class="{
          active: store.currentFile === file.id,
          starred: file.starred,
          'drag-over': dragOverId === file.id
        }"
        draggable="true"
        @click="handleFileClick(file)"
        @contextmenu.prevent="openFileContext($event, file)"
        @dragstart="onFileDragStart($event, file.id)"
        @dragover.prevent.stop="onFileDragOver($event, file.id)"
        @dragleave="onFileDragLeave"
        @drop.prevent.stop="onFileDrop($event, file.id)"
        @dragend="onDragEnd"
      >
        <div class="file-item-top">
          <div class="file-name">
            <span v-if="store.currentCat === 'c2' && !isGlobalUnlocked()" class="file-star" style="margin-right: 2px;">
              <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </span>
            <span v-else-if="store.currentCat === 'c2' && isGlobalUnlocked()" class="file-star" style="margin-right: 2px;">
              <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
            </span>
            <span class="file-star" v-if="file.starred">★</span>
            <template v-if="editingFileId === file.id">
              <input
                class="file-name-input"
                :value="file.name"
                @blur="finishRename(file, $event)"
                @keydown.enter="$event.target.blur()"
                @keydown.escape="$event.target.blur()"
                @click.stop
                ref="fileRenameInput"
                autofocus
              />
            </template>
            <span v-else class="file-name-text">{{ file.name }}</span>
          </div>
          <!-- 导出按钮 -->
          <button class="file-export" @click.stop="handleExport($event, file)" title="导出">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </button>
          <button class="file-more" @click.stop="openFileContext($event, file)" title="更多操作">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
            </svg>
          </button>
        </div>
        <div class="file-meta">
          <span class="file-tag" :class="'tag-' + file.tag?.toLowerCase()">{{ file.tag }}</span>
          <span v-if="file.locked" class="file-lock">🔒</span>
          <span class="file-count">{{ getFileItemCount(file) }} {{ file.type === 'markdown' ? '字符' : '条' }}</span>
          <span class="file-time" v-if="file.updatedAt">{{ getFileTime(file) }}</span>
        </div>
      </div>

      <div class="file-empty" v-if="filteredFiles.length === 0">
        <template v-if="store.searchQuery">
          <p>没有找到匹配的文件</p>
        </template>
        <template v-else>
          <p>此分类暂无文件</p>
          <button class="empty-add-btn" @click="handleAddFile">创建文件</button>
        </template>
      </div>

      <!-- 底部添加文件按钮 -->
      <div class="file-list-bottom" v-if="filteredFiles.length > 0 && !store.searchQuery">
        <button class="add-file-btn" @click="handleAddFile">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          新建文件
        </button>
      </div>
    </div>

    <!-- 导出菜单 -->
    <div v-if="exportMenuVisible" class="export-overlay" @click="exportMenuVisible = false"></div>
    <div v-if="exportMenuVisible" class="export-menu" :style="exportMenuStyle">
      <div class="export-title">导出文件</div>
      <div class="export-item" @click="doExport('md')">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        Markdown (.md)
      </div>
      <div class="export-item" @click="doExport('txt')">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        纯文本 (.txt)
      </div>
      <div class="export-item" @click="doExport('json')">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
        JSON (.json)
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
import {
  store, getSortedFiles, getPreview, selectFile,
  addFile as storeAddFile, getCurrentCat,
  highlightText, formatTime, showToast,
  exportFileAsText, exportFileAsJson, downloadFile,
  isGlobalUnlocked, isPasswordFile, unlockGlobal
} from '../stores/useStore.js'

const scopes = [
  { key: 'file', label: '文件' },
  { key: 'category', label: '分类' },
  { key: 'global', label: '全局' }
]

const editingFileId = ref(null)
const fileRenameInput = ref(null)
const dragFileId = ref(null)
const dragOverId = ref(null)
const scopeOpen = ref(false)

// Export menu
const exportMenuVisible = ref(false)
const exportMenuStyle = ref({})
const exportFile = ref(null)

const currentCatName = computed(() => getCurrentCat()?.name || '')
const currentScopeLabel = computed(() => scopes.find(s => s.key === store.searchScope)?.label || '文件')

const filteredFiles = computed(() => {
  const files = getSortedFiles(store.currentCat)
  const q = store.searchQuery.toLowerCase().trim()
  if (!q) return files

  if (store.searchScope === 'file') return files

  const matchesQuery = (f) => {
    if (f.name.toLowerCase().includes(q)) return true
    if (f.type === 'markdown' && f.content?.toLowerCase().includes(q)) return true
    if (f.blocks) {
      return f.blocks.some(b =>
        b.title.toLowerCase().includes(q) ||
        (b.items || []).some(i => i.text.toLowerCase().includes(q))
      )
    }
    return false
  }

  if (store.searchScope === 'category') {
    return files.filter(matchesQuery)
  }

  // Global search
  const allMatchingIds = new Set()
  for (const catId in store.files) {
    for (const f of store.files[catId]) {
      if (matchesQuery(f)) allMatchingIds.add(f.id)
    }
  }
  return files.filter(f => allMatchingIds.has(f.id))
})

function getFilePreview(file) { return getPreview(file) }
function getFilePreviewHtml(file) {
  const text = getPreview(file)
  const q = store.searchQuery.trim()
  if (q) return highlightText(text, q)
  return text
}
function getFileTime(file) { return formatTime(file.updatedAt) }
function getFileItemCount(file) {
  if (file.type === 'markdown') return (file.content || '').length
  return (file.blocks || []).reduce((a, b) => a + (b.items || []).length, 0)
}

function handleAddFile() {
  const file = storeAddFile()
  if (file) {
    nextTick(() => {
      selectFile(file.id)
      nextTick(() => {
        const display = document.querySelector('.block-text-display')
        if (display) {
          display.click()
        }
      })
    })
  }
}

function handleFileClick(file) {
  console.log(`[FilePanel] clicked file: ${file.name} (id: ${file.id}), currentCat: ${store.currentCat}`)
  
  if (store.currentCat === 'c2') {
    // c2 是密码类别
    if (!isGlobalUnlocked()) {
      console.log(`[FilePanel] c2 clicked, but locked. Prompting unlock overlay.`)
      // 不管解没解锁，都先设置 currentFile，这样右侧会显示锁定状态
      store.currentFile = file.id
      
      store.lockFileId = '__global__'
      store.lockMode = 'unlock'
      store.lockCallback = () => {
        import('../stores/useStore.js').then(({ unlockGlobal }) => {
          console.log(`[FilePanel] unlockCallback executing`)
          unlockGlobal()
          // 不用再调用 selectFile，直接让 Vue 响应
          store.currentFile = file.id
        })
      }
      store.lockVisible = true
      return
    } else {
      console.log(`[FilePanel] c2 clicked and already unlocked`)
    }
  }
  selectFile(file.id)
}

function openFileContext(e, file) {
  e.preventDefault()
  store.ctxX = Math.min(e.clientX || e.pageX, window.innerWidth - 200)
  store.ctxY = Math.min(e.clientY || e.pageY, window.innerHeight - 350)
  store.ctxTarget = file.id
  store.ctxType = 'file'
  store.ctxVisible = true
}

// Inline Rename via Context Menu Event
function handleInlineRenameEvent(e) {
  const fileId = e.detail.id
  if (fileId) {
    editingFileId.value = fileId
    nextTick(() => {
      if (fileRenameInput.value && fileRenameInput.value[0]) {
        fileRenameInput.value[0].focus()
        fileRenameInput.value[0].select()
      } else if (fileRenameInput.value) {
        fileRenameInput.value.focus()
        fileRenameInput.value.select()
      }
    })
  }
}

onMounted(() => {
  window.addEventListener('quill-inline-rename-file', handleInlineRenameEvent)
})

onUnmounted(() => {
  window.removeEventListener('quill-inline-rename-file', handleInlineRenameEvent)
})

function finishRename(file, e) {
  const val = e.target.value.trim()
  if (val) file.name = val
  editingFileId.value = null
}

// Export
function handleExport(e, file) {
  if (isPasswordFile(file.id) && !isGlobalUnlocked()) {
    store.lockFileId = '__global__'
    store.lockMode = 'unlock'
    store.lockCallback = () => {
      unlockGlobal()
      exportFile.value = file
      const rect = e.target.closest('.file-export').getBoundingClientRect()
      exportMenuStyle.value = {
        left: Math.min(rect.left, window.innerWidth - 200) + 'px',
        top: (rect.bottom + 4) + 'px'
      }
      exportMenuVisible.value = true
    }
    store.lockVisible = true
    return
  }

  exportFile.value = file
  const rect = e.target.closest('.file-export').getBoundingClientRect()
  exportMenuStyle.value = {
    left: Math.min(rect.left, window.innerWidth - 200) + 'px',
    top: (rect.bottom + 4) + 'px'
  }
  exportMenuVisible.value = true
}

function doExport(format) {
  const file = exportFile.value
  if (!file) return
  exportMenuVisible.value = false

  switch (format) {
    case 'md': {
      const text = exportFileAsText(file.id)
      downloadFile(text, file.name + '.md')
      break
    }
    case 'txt': {
      const text = exportFileAsText(file.id)
      downloadFile(text, file.name + '.txt')
      break
    }
    case 'json': {
      const json = exportFileAsJson(file.id)
      if (json) downloadFile(json, file.name + '.json', 'application/json')
      break
    }
  }
}

// Drag & drop
function onFileDragStart(e, id) {
  dragFileId.value = id
  e.target.classList.add('dragging')
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', id)
}
function onFileDragOver(e, id) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragOverId.value = id
}
function onFileDragLeave() { dragOverId.value = null }
function onFileDrop(e, targetId) {
  const srcId = dragFileId.value
  if (srcId && srcId !== targetId) {
    const files = store.files[store.currentCat] || []
    const src = files.find(f => f.id === srcId)
    const dst = files.find(f => f.id === targetId)
    if (src && dst) {
      const tmp = src.order
      src.order = dst.order
      dst.order = tmp
    }
  }
  dragOverId.value = null
  dragFileId.value = null
}
function onDragEnd() {
  dragFileId.value = null
  dragOverId.value = null
  document.querySelectorAll('.file-item').forEach(el => el.classList.remove('dragging'))
}

defineExpose({ editingFileId })
</script>

<style scoped>
.file-panel {
  background: var(--bg);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column; overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s;
  min-width: 0;
}
.file-panel.hidden { width: 0; opacity: 0; pointer-events: none; }

.file-panel-header { padding: 20px 16px 12px; border-bottom: 1px solid var(--border-light); flex-shrink: 0; }
.file-panel-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.file-panel-title { 
  display: flex; align-items: center; gap: 8px;
  font-family: 'Cormorant Garamond', serif; font-size: 18px; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
}
.file-panel-actions { display: flex; gap: 4px; }
.icon-btn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer;
  color: var(--text-muted); border-radius: 6px; transition: all 0.15s;
}
.icon-btn:hover { background: var(--surface-hover); color: var(--text-primary); }

/* Search bar with integrated scope dropdown */
.search-bar {
  position: relative; display: flex; align-items: center;
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); transition: all 0.2s;
}
.search-bar:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }

.search-scope-trigger {
  display: flex; align-items: center; gap: 3px; padding: 0 8px 0 10px;
  cursor: pointer; flex-shrink: 0; border-right: 1px solid var(--border-light);
  height: 34px; transition: background 0.15s;
}
.search-scope-trigger:hover { background: var(--surface-hover); }
.scope-label { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.scope-arrow { color: var(--text-muted); transition: transform 0.2s; }
.scope-arrow.open { transform: rotate(180deg); }

.search-scope-dropdown {
  position: absolute; left: 0; top: 100%; margin-top: 4px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  padding: 4px; z-index: 100; min-width: 100px;
}
.scope-option {
  padding: 6px 12px; border-radius: 6px; font-size: 12px;
  color: var(--text-secondary); cursor: pointer; transition: all 0.1s;
}
.scope-option:hover { background: var(--surface-hover); color: var(--text-primary); }
.scope-option.active { background: var(--accent-light); color: var(--accent); }

.search-input {
  flex: 1; padding: 8px 8px 8px 10px; border: none; background: transparent;
  font-family: inherit; font-size: 13px; color: var(--text-primary); outline: none; min-width: 0;
}
.search-input::placeholder { color: var(--text-muted); }

.search-icon {
  width: 14px; height: 14px; color: var(--text-muted); flex-shrink: 0;
  margin-right: 8px; pointer-events: none;
}

.search-clear {
  border: none; background: transparent; cursor: pointer;
  color: var(--text-muted); padding: 2px; margin-right: 4px; border-radius: 50%;
  flex-shrink: 0;
}
.search-clear:hover { color: var(--text-primary); background: var(--surface-hover); }

/* File list */
.file-list { flex: 1; overflow-y: auto; padding: 8px; }
.file-item {
  padding: 12px 14px; border-radius: var(--radius); cursor: pointer;
  transition: all 0.15s; margin-bottom: 2px; position: relative;
}
.file-item:hover { background: var(--surface); box-shadow: var(--shadow-sm); }
.file-item.active { background: var(--accent-light); box-shadow: var(--shadow-sm); border-left: 3px solid var(--accent); padding-left: 11px; }
.file-item.dragging { opacity: 0.3; transform: scale(0.98); }
.file-item.drag-over { border-top: 3px solid var(--accent); padding-top: 9px; background: var(--accent-light); }

.file-item-top { display: flex; align-items: flex-start; gap: 4px; }
.file-name {
  display: flex; align-items: center;
  font-size: 14px; font-weight: 400; color: var(--text-primary);
  flex: 1; min-width: 0;
}
.file-name-text {
  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
.file-name-input {
  flex: 1; border: none; background: var(--surface-hover); font-family: inherit;
  font-size: 14px; color: var(--text-primary); outline: none; padding: 2px 6px; border-radius: 4px;
  min-width: 0;
}
.file-star { color: var(--accent); font-size: 12px; margin-right: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }

.file-export {
  width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer;
  color: var(--text-muted); border-radius: 4px; transition: all 0.15s; flex-shrink: 0;
}
.file-export:hover { background: var(--accent-light); color: var(--accent); }

.file-more {
  width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer;
  color: var(--text-muted); border-radius: 4px; transition: all 0.15s; flex-shrink: 0;
  opacity: 0.5;
}
.file-more:hover { background: var(--surface-hover); color: var(--text-primary); opacity: 1; }

.file-preview {
  font-size: 12px; color: var(--text-muted); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; margin-top: 4px;
}
.file-meta {
  display: flex; align-items: center; gap: 8px; margin-top: 6px;
  font-size: 11px; color: var(--text-muted);
}
.file-tag { padding: 2px 8px; background: var(--accent-light); color: var(--accent); border-radius: 4px; font-size: 10px; font-weight: 500; }
.file-lock { font-size: 11px; }
.file-count { font-size: 11px; }
.file-time { font-size: 10px; margin-left: auto; color: var(--text-muted); }

:deep(.search-hl) { background: #fef08a; color: inherit; padding: 1px 2px; border-radius: 2px; }

.file-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 200px; color: var(--text-muted); font-size: 13px; gap: 12px;
}
.empty-add-btn {
  padding: 6px 16px; border: 1px solid var(--border); background: var(--surface);
  border-radius: var(--radius); cursor: pointer; font-family: inherit;
  font-size: 12px; color: var(--text-secondary); transition: all 0.15s;
}
.empty-add-btn:hover { border-color: var(--accent); color: var(--accent); }

.file-list-bottom {
  padding: 8px 0;
  display: flex;
  justify-content: center;
}
.add-file-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 10px; border: 1px dashed var(--border);
  background: transparent; color: var(--text-muted); border-radius: var(--radius);
  cursor: pointer; font-family: inherit; font-size: 13px; transition: all 0.2s;
}
.add-file-btn:hover {
  border-color: var(--accent); color: var(--accent); background: var(--accent-light);
}

/* Export menu */
.export-overlay { position: fixed; inset: 0; z-index: 500; }
.export-menu {
  position: fixed; z-index: 501; background: var(--surface);
  border: 1px solid var(--border); border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12); padding: 8px; min-width: 180px;
}
.export-title {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-muted); padding: 4px 10px 6px;
}
.export-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  border-radius: 6px; cursor: pointer; font-size: 13px;
  color: var(--text-secondary); transition: all 0.1s;
}
.export-item:hover { background: var(--surface-hover); color: var(--text-primary); }
.export-item svg { opacity: 0.6; }
</style>
