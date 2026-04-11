<template>
  <div class="file-panel" :class="{ hidden: store.filePanelCollapsed }">
    <div class="file-panel-header">
      <div class="file-panel-top">
        <div class="file-panel-title">{{ currentCatName }}</div>
        <div class="file-panel-actions">
          <button class="icon-btn" @click="handleAddFile" title="新建文件">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
          <button class="icon-btn" @click="store.filePanelCollapsed = true" title="收起文件列表">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="search-wrap">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          class="search-input"
          placeholder="搜索文件..."
          v-model="store.searchQuery"
          @keydown.escape="store.searchQuery = ''"
        />
        <button v-if="store.searchQuery" class="search-clear" @click="store.searchQuery = ''">
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="search-scope">
        <button
          v-for="scope in scopes"
          :key="scope.key"
          class="search-scope-btn"
          :class="{ active: store.searchScope === scope.key }"
          @click="store.searchScope = scope.key"
        >{{ scope.label }}</button>
      </div>
    </div>

    <div class="file-list">
      <div
        v-for="file in filteredFiles"
        :key="file.id"
        class="file-item"
        :class="{
          active: file.id === store.currentFile,
          starred: file.starred,
          'drag-over': dragOverId === file.id
        }"
        draggable="true"
        @click="selectFile(file.id)"
        @contextmenu.prevent="openFileContext($event, file)"
        @dragstart="onFileDragStart($event, file.id)"
        @dragover.prevent="onFileDragOver($event, file.id)"
        @dragleave="onFileDragLeave"
        @drop.prevent="onFileDrop($event, file.id)"
        @dragend="onDragEnd"
      >
        <div class="file-item-top">
          <div class="file-name">
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
              />
            </template>
            <template v-else>{{ file.name }}</template>
          </div>
          <button class="file-more" @click.stop="openFileContext($event, file)" title="更多操作">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
            </svg>
          </button>
        </div>
        <div class="file-preview">{{ getFilePreview(file) }}</div>
        <div class="file-meta">
          <span class="file-tag" :class="'tag-' + file.tag?.toLowerCase()">{{ file.tag }}</span>
          <span v-if="file.locked" class="file-lock">🔒</span>
          <span class="file-count">{{ getFileItemCount(file) }} {{ file.type === 'markdown' ? '字符' : '条' }}</span>
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
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, watch } from 'vue'
import {
  store, getSortedFiles, getPreview, selectFile as storeSelectFile,
  addFile as storeAddFile, getCurrentCat, showToast
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

const currentCatName = computed(() => getCurrentCat()?.name || '')

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
function getFileItemCount(file) {
  if (file.type === 'markdown') return (file.content || '').length
  return (file.blocks || []).reduce((a, b) => a + (b.items || []).length, 0)
}

function handleAddFile() {
  const file = storeAddFile()
  if (!file) return
  nextTick(() => {
    storeSelectFile(file.id)
    nextTick(() => {
      // Auto-focus on the content textarea of the first block
      const display = document.querySelector('.block-text-display')
      if (display) display.click()
    })
  })
}

function openFileContext(e, file) {
  e.preventDefault()
  store.ctxX = Math.min(e.clientX || e.pageX, window.innerWidth - 200)
  store.ctxY = Math.min(e.clientY || e.pageY, window.innerHeight - 350)
  store.ctxTarget = file.id
  store.ctxType = 'file'
  store.ctxVisible = true
}

function finishRename(file, e) {
  const val = e.target.value.trim()
  if (val) file.name = val
  editingFileId.value = null
}

// Drag & drop
function onFileDragStart(e, id) {
  dragFileId.value = id
  e.target.classList.add('dragging')
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', id)
}
function onFileDragOver(e, id) { dragOverId.value = id }
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

// Expose editingFileId for rename trigger from ContextMenu
defineExpose({ editingFileId })
</script>

<style scoped>
.file-panel {
  background: var(--bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s;
  min-width: 0;
}
.file-panel.hidden {
  width: 0;
  opacity: 0;
  pointer-events: none;
}

.file-panel-header {
  padding: 20px 16px 12px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}
.file-panel-top {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
}
.file-panel-title {
  font-family: 'Cormorant Garamond', serif; font-size: 18px;
  font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.file-panel-actions { display: flex; gap: 4px; }
.icon-btn {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer;
  color: var(--text-muted); border-radius: 6px; transition: all 0.15s;
}
.icon-btn:hover { background: var(--surface-hover); color: var(--text-primary); }

/* Search */
.search-wrap { position: relative; }
.search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  width: 14px; height: 14px; color: var(--text-muted); pointer-events: none;
}
.search-input {
  width: 100%; padding: 8px 30px 8px 32px;
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); font-family: inherit; font-size: 13px;
  color: var(--text-primary); transition: all 0.2s;
}
.search-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }
.search-input::placeholder { color: var(--text-muted); }
.search-clear {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  border: none; background: transparent; cursor: pointer;
  color: var(--text-muted); padding: 2px; border-radius: 50%;
}
.search-clear:hover { color: var(--text-primary); background: var(--surface-hover); }

.search-scope { display: flex; gap: 4px; margin-top: 8px; }
.search-scope-btn {
  padding: 4px 10px; border: 1px solid var(--border); background: var(--surface);
  border-radius: 20px; font-size: 11px; color: var(--text-muted);
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.search-scope-btn.active { background: var(--accent-light); color: var(--accent); border-color: var(--accent); }

/* File list */
.file-list { flex: 1; overflow-y: auto; padding: 8px; }
.file-item {
  padding: 12px 14px; border-radius: var(--radius); cursor: pointer;
  transition: all 0.15s; margin-bottom: 2px; position: relative;
}
.file-item:hover { background: var(--surface); box-shadow: var(--shadow-sm); }
.file-item.active { background: var(--surface); box-shadow: var(--shadow-md); }
.file-item.dragging { opacity: 0.4; }
.file-item.drag-over { border-top: 2px solid var(--accent); padding-top: 10px; }

.file-item-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.file-name {
  font-size: 14px; font-weight: 400; color: var(--text-primary);
  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.file-name-input {
  flex: 1; border: none; background: var(--surface-hover); font-family: inherit;
  font-size: 14px; color: var(--text-primary); outline: none; padding: 2px 6px; border-radius: 4px;
}
.file-star { color: var(--accent); font-size: 12px; margin-right: 4px; }

.file-more {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer; color: var(--text-muted);
  border-radius: 4px; opacity: 0; transition: all 0.15s; flex-shrink: 0;
}
.file-item:hover .file-more { opacity: 1; }
.file-more:hover { background: var(--surface-hover); color: var(--text-primary); }

.file-preview {
  font-size: 12px; color: var(--text-muted); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; margin-top: 4px;
}
.file-meta {
  display: flex; align-items: center; gap: 8px; margin-top: 6px;
  font-size: 11px; color: var(--text-muted);
}
.file-tag {
  padding: 2px 8px; background: var(--accent-light); color: var(--accent);
  border-radius: 4px; font-size: 10px; font-weight: 500;
}
.file-lock { font-size: 11px; }
.file-count { font-size: 11px; }

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
</style>
