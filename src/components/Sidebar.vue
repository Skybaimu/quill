<template>
  <aside class="sidebar" :class="{ collapsed: store.sidebarCollapsed }">
    <div class="sidebar-header">
      <div class="logo" v-show="!store.sidebarCollapsed">
        <span class="logo-q">q</span>uill
      </div>
      <button class="icon-btn import-export-btn" @click="showImportExport = !showImportExport" title="导入/导出" v-show="!store.sidebarCollapsed">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
        </svg>
      </button>
      <button class="toggle-btn" @click="store.sidebarCollapsed = !store.sidebarCollapsed" :title="store.sidebarCollapsed ? '展开' : '收起'">
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="!store.sidebarCollapsed" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
        </svg>
      </button>
    </div>

    <!-- Expanded content -->
    <div class="sidebar-body" v-show="!store.sidebarCollapsed">
      <!-- Workspace section -->
      <div class="sidebar-section">
        <div class="sidebar-label">
          <span>工作空间</span>
          <button class="icon-btn" @click="handleAddCategory" title="新建分类">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
        <div class="category-list">
          <div
            v-for="cat in sortedCategories"
            :key="cat.id"
            class="cat-item"
            :class="{
              active: cat.id === store.currentCat,
              pinned: cat.pinned,
              'drag-over': dragOverId === cat.id
            }"
            draggable="true"
            @click="selectCategory(cat.id)"
            @contextmenu.prevent="openCatContext($event, cat)"
            @dragstart="onCatDragStart($event, cat.id)"
            @dragover.prevent="onCatDragOver($event, cat.id)"
            @dragleave="onCatDragLeave"
            @drop.prevent="onCatDrop($event, cat.id)"
            @dragend="onDragEnd"
          >
            <div class="cat-pin" v-if="cat.pinned"></div>
            <svg class="cat-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="ICONS[cat.icon]"></svg>
            <template v-if="editingCatId === cat.id">
              <input
                ref="catNameInputRef"
                class="cat-input"
                :value="cat.name"
                @blur="finishCatName(cat, $event)"
                @keydown.enter="$event.target.blur()"
                @keydown.escape="cancelCatEdit"
                @click.stop
              />
            </template>
            <template v-else>
              <span class="cat-name">{{ cat.name || '未命名分类' }}</span>
              <span class="cat-count">{{ getFileCount(cat.id) }}</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Starred section -->
      <div class="sidebar-section" v-if="starredItems.length > 0">
        <div class="sidebar-label"><span>收藏</span></div>
        <div class="starred-list">
          <div
            v-for="item in starredItems"
            :key="item.fileId"
            class="starred-item"
            :title="item.catName + ' / ' + item.fileName"
            @click="jumpToStarred(item)"
          >
            <svg width="14" height="14" fill="none" stroke="var(--accent)" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            <div class="starred-info">
              <span class="starred-name">{{ item.fileName }}</span>
              <span class="starred-cat">{{ item.catName }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="import-export-panel" v-if="showImportExport">
        <div class="ie-title">导入 / 导出</div>
        <button class="ie-btn" @click="doExportAll">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          导出全部数据
        </button>
        <label class="ie-btn ie-import">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          导入数据
          <input type="file" accept=".json" @change="doImport" hidden />
        </label>
        <div class="ie-hint">导出为 JSON 文件，可备份或迁移数据</div>
      </div>
    </div>

    <!-- Collapsed icon-only mode -->
    <div class="sidebar-collapsed-list" v-show="store.sidebarCollapsed">
      <div
        v-for="cat in sortedCategories"
        :key="cat.id"
        class="cat-mini"
        :class="{ active: cat.id === store.currentCat }"
        :title="cat.name"
        @click="selectCategory(cat.id)"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="ICONS[cat.icon]"></svg>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { store, getSortedCategories, getFileCount, selectCategory, addCategory as storeAddCategory, exportAllAsJson, importFromJson, downloadFile, readFileAsText, showToast } from '../stores/useStore.js'

const ICONS = {
  sparkle: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>',
  key: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>',
  bulb: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>',
  doc: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>'
}

const editingCatId = ref(null)
const catNameInputRef = ref(null)
const dragCatId = ref(null)
const dragOverId = ref(null)
const showImportExport = ref(false)

const sortedCategories = computed(() => getSortedCategories())

const starredItems = computed(() => {
  const items = []
  for (const cat of store.categories) {
    const files = store.files[cat.id] || []
    for (const f of files) {
      if (f.starred) {
        items.push({ fileId: f.id, fileName: f.name, catId: cat.id, catName: cat.name, catIcon: cat.icon })
      }
    }
  }
  return items
})

function handleAddCategory() {
  const cat = storeAddCategory()
  editingCatId.value = cat.id
  nextTick(() => {
    const input = document.querySelector('.cat-input')
    if (input) { input.focus(); input.select() }
  })
}

function finishCatName(cat, e) {
  const val = e.target.value.trim()
  cat.name = val || '未命名分类'
  editingCatId.value = null
}

function cancelCatEdit() {
  editingCatId.value = null
}

function openCatContext(e, cat) {
  e.preventDefault()
  store.ctxX = Math.min(e.clientX, window.innerWidth - 200)
  store.ctxY = Math.min(e.clientY, window.innerHeight - 200)
  store.ctxTarget = cat.id
  store.ctxType = 'category'
  store.ctxVisible = true
}

function jumpToStarred(item) {
  selectCategory(item.catId)
  nextTick(() => {
    store.currentFile = item.fileId
    store.filePanelCollapsed = false
  })
}

// Import/Export
function doExportAll() {
  const json = exportAllAsJson()
  downloadFile(json, 'quill-backup-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json')
  showToast('已导出全部数据')
  showImportExport.value = false
}

async function doImport(e) {
  const file = e.target.files[0]
  if (!file) return
  try {
    const text = await readFileAsText(file)
    if (confirm('导入将合并到现有数据，是否继续？\n\n点"确定"合并，点"取消"中止')) {
      importFromJson(text, 'merge')
    }
  } catch (err) {
    showToast('读取文件失败')
  }
  e.target.value = ''
  showImportExport.value = false
}

// Drag & drop for categories
function onCatDragStart(e, id) {
  dragCatId.value = id
  e.target.classList.add('dragging')
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', id)
}

function onCatDragOver(e, id) {
  dragOverId.value = id
}

function onCatDragLeave() {
  dragOverId.value = null
}

function onCatDrop(e, targetId) {
  const srcId = dragCatId.value
  if (srcId && srcId !== targetId) {
    const src = store.categories.find(c => c.id === srcId)
    const dst = store.categories.find(c => c.id === targetId)
    if (src && dst) {
      const tmpOrder = src.order
      src.order = dst.order
      dst.order = tmpOrder
    }
  }
  dragOverId.value = null
  dragCatId.value = null
}

function onDragEnd() {
  dragCatId.value = null
  dragOverId.value = null
  document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('dragging'))
}
</script>

<style scoped>
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar-header {
  display: flex;
  align-items: center;
  padding: 20px 16px 12px;
  gap: 8px;
  flex-shrink: 0;
}
.logo {
  font-family: 'Cormorant Garamond', serif;
  font-size: 22px;
  font-weight: 300;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.logo-q { color: var(--accent); }

.toggle-btn {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer;
  color: var(--text-muted); border-radius: 6px;
  transition: all 0.15s; margin-left: auto; flex-shrink: 0;
}
.toggle-btn:hover { background: var(--surface-hover); color: var(--text-primary); }

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 8px 16px;
}

.sidebar-label {
  font-size: 10px; font-weight: 500; text-transform: uppercase;
  letter-spacing: 0.12em; color: var(--text-muted);
  padding: 16px 12px 8px;
  display: flex; align-items: center; justify-content: space-between;
}
.icon-btn {
  width: 20px; height: 20px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer;
  color: var(--text-muted); border-radius: 4px; transition: all 0.15s;
}
.icon-btn:hover { background: var(--accent-light); color: var(--accent); }

/* Category items */
.cat-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: var(--radius);
  cursor: pointer; transition: all 0.15s; color: var(--text-secondary);
  position: relative; user-select: none;
}
.cat-item:hover { background: var(--surface-hover); color: var(--text-primary); }
.cat-item.active { background: var(--accent-light); color: var(--accent); }
.cat-item.dragging { opacity: 0.4; }
.cat-item.drag-over { border-top: 2px solid var(--accent); padding-top: 7px; }

.cat-pin {
  position: absolute; left: 3px; top: 50%; transform: translateY(-50%);
  width: 5px; height: 5px; background: var(--accent); border-radius: 50%;
}
.cat-icon { opacity: 0.6; flex-shrink: 0; }
.cat-item.active .cat-icon { opacity: 1; }
.cat-name {
  flex: 1; font-size: 13px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.cat-count { font-size: 11px; color: var(--text-muted); }
.cat-item.active .cat-count { color: var(--accent); }

.cat-input {
  flex: 1; border: none; background: var(--surface-hover);
  font-family: inherit; font-size: 13px; color: var(--text-primary);
  outline: none; padding: 2px 6px; border-radius: 4px;
}

/* Collapsed mode */
.sidebar-collapsed-list {
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; padding: 8px 0;
}
.cat-mini {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius); cursor: pointer;
  color: var(--text-muted); transition: all 0.15s;
}
.cat-mini:hover { background: var(--surface-hover); color: var(--text-primary); }
.cat-mini.active { background: var(--accent-light); color: var(--accent); }

/* Starred section */
.starred-list { padding: 0 4px; }
.starred-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: var(--radius);
  cursor: pointer; transition: all 0.15s; color: var(--text-secondary);
}
.starred-item:hover { background: var(--surface-hover); color: var(--text-primary); }
.starred-info { display: flex; flex-direction: column; min-width: 0; }
.starred-name {
  font-size: 12px; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; color: var(--text-primary);
}
.starred-cat { font-size: 10px; color: var(--text-muted); }

/* Import/Export panel */
.import-export-panel {
  padding: 12px; margin: 4px 8px; background: var(--surface-hover);
  border-radius: var(--radius); border: 1px solid var(--border-light);
}
.ie-title { font-size: 11px; font-weight: 500; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.08em; }
.ie-btn {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px;
  border: none; background: transparent; cursor: pointer; border-radius: 6px;
  font-family: inherit; font-size: 12px; color: var(--text-secondary); transition: all 0.1s;
}
.ie-btn:hover { background: var(--surface); color: var(--text-primary); }
.ie-import { cursor: pointer; }
.ie-hint { font-size: 10px; color: var(--text-muted); margin-top: 6px; padding: 0 4px; }
</style>
