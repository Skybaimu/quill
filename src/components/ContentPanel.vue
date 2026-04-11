<template>
  <div class="content-panel">
    <!-- Header toolbar -->
    <div class="content-header">
      <div class="content-header-left">
        <button class="toggle-btn" @click="store.sidebarCollapsed = !store.sidebarCollapsed" title="切换侧栏 (Ctrl+B)">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <button class="toggle-btn" v-if="store.filePanelCollapsed" @click="store.filePanelCollapsed = false" title="展开文件列表">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
        </button>
        <div class="content-breadcrumb" v-if="currentFile">
          <span class="bc-cat">{{ currentCatName }}</span>
          <span class="bc-sep">/</span>
          <span class="bc-file">{{ currentFile.name }}</span>
          <span class="bc-time" v-if="fileTime"> · {{ fileTime }}</span>
        </div>
        <div class="content-breadcrumb" v-else>选择文件</div>
      </div>
      <div class="content-actions" v-if="currentFile">
        <button class="action-btn" v-if="currentFile.type === 'markdown'" @click="toggleMdEdit">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          {{ store.mdEditMode ? '预览' : '编辑' }}
        </button>
        <template v-if="currentFile.type !== 'markdown'">
          <button class="action-btn" @click="doExpandAll" title="展开全部">展开全部</button>
          <button class="action-btn" @click="doCollapseAll" title="折叠全部">折叠全部</button>
        </template>
        <button class="action-btn primary" @click="doCopyAll">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          复制全部
        </button>
      </div>
    </div>

    <!-- Content body -->
    <div class="content-body" ref="contentBodyRef">
      <!-- Empty state -->
      <div class="empty-state" v-if="!currentFile">
        <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" opacity="0.15">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p>选择或创建一个文件</p>
        <p class="empty-hint">Ctrl+N 新建文件 · Ctrl+B 切换侧栏</p>
      </div>

      <!-- Markdown file -->
      <template v-else-if="currentFile.type === 'markdown'">
        <div class="md-wrapper" :class="{ editing: store.mdEditMode }">
          <div class="md-preview-pane">
            <div class="content-file-title">{{ currentFile.name }}</div>
            <div class="md-content" v-html="renderMd(currentFile.content || '')"></div>
          </div>
          <div
            class="md-resizer"
            v-if="store.mdEditMode"
            @mousedown.prevent="startMdResize"
          ></div>
          <div class="md-edit-pane" v-if="store.mdEditMode" :style="{ flex: mdEditFlex }">
            <textarea
              class="md-source"
              :value="currentFile.content || ''"
              @input="onMdInput($event.target.value)"
              spellcheck="false"
            ></textarea>
          </div>
        </div>
      </template>

      <!-- Text file with blocks -->
      <template v-else>
        <div class="content-layout">
          <div class="content-file-title">{{ currentFile.name }}</div>

          <div
            v-for="block in visibleBlocks"
            :key="block.id"
            class="content-block"
            :data-block-id="block.id"
          >
            <!-- Block header -->
            <div class="block-header" @click="toggleBlock(block)">
              <div class="block-toggle" :class="{ collapsed: block.collapsed }">
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>

              <template v-if="renamingBlockId === block.id">
                <input
                  class="block-title-input"
                  :value="block.title"
                  @blur="finishBlockRename(block, $event)"
                  @keydown.enter="$event.target.blur()"
                  @keydown.escape="renamingBlockId = null"
                  @click.stop
                  ref="blockRenameRef"
                />
              </template>
              <template v-else>
                <div class="block-title">
                  <span v-if="block.starred" class="block-star">★</span>
                  <span v-html="hlText(block.title)"></span>
                </div>
              </template>

              <div class="block-actions">
                <button class="block-btn" @click.stop="copyBlock(block)" title="复制此内容块">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </button>
                <button class="block-btn" @click.stop="openBlockMenu($event, block)" title="更多操作">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Block content -->
            <transition name="block-expand">
              <div class="block-content" v-show="!block.collapsed">
                <template v-for="item in block.items" :key="item.id">
                  <!-- API type -->
                  <div v-if="item.type === 'api'" class="api-block" :class="{ locked: item._locked !== false }">
                    <div class="api-inner">
                      <div class="api-label">{{ item.label }}</div>
                      <div class="api-value">
                        <span v-html="hlText(item.text)"></span>
                        <button class="api-copy" @click.stop="copyText(item.text, item.label)">复制</button>
                      </div>
                    </div>
                    <div class="api-unlock-overlay">
                      <button class="api-unlock-btn" @click.stop="unlockApi(item)">
                        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                        点击解锁
                      </button>
                    </div>
                  </div>
                  <!-- Text type -->
                  <div v-else class="block-text-wrap">
                    <div
                      v-if="editingBlockId !== block.id"
                      class="block-text-display"
                      @click="startEdit(block)"
                    >
                      <span v-if="hasQuery" v-html="hlText(item.text)"></span>
                      <span v-else>{{ item.text || '' }}</span>
                    </div>
                    <textarea
                      v-else
                      class="block-textarea"
                      :value="item.text"
                      @blur="saveBlockText(block, item, $event)"
                      @input="autoGrow($event.target)"
                      ref="blockTextareaRef"
                      spellcheck="false"
                    ></textarea>
                  </div>
                </template>
              </div>
            </transition>
          </div>

          <!-- Search no-results hint -->
          <div class="search-no-blocks" v-if="hasQuery && visibleBlocks.length === 0 && currentFile">
            <p>此文件中没有匹配的内容块</p>
          </div>

          <!-- Add block -->
          <button class="add-block-btn" @click="handleAddBlock" v-if="!hasQuery">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            添加内容块
          </button>
        </div>
      </template>
    </div>

    <!-- Word count -->
    <div class="word-count" v-if="currentFile">
      <span>{{ wordCount }} 字</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import {
  store, findFile, getCurrentCat, addBlock as storeAddBlock, deleteBlock,
  addFile as storeAddFile, selectFile as storeSelectFile,
  highlightText, blockMatchesQuery, formatTime, showToast
} from '../stores/useStore.js'

const contentBodyRef = ref(null)
const blockTextareaRef = ref(null)
const blockRenameRef = ref(null)
const editingBlockId = ref(null)
const renamingBlockId = ref(null)
const mdEditFlex = ref(1)

const currentFile = computed(() => findFile(store.currentFile))
const currentCatName = computed(() => getCurrentCat()?.name || '')
const hasQuery = computed(() => store.searchQuery.trim().length > 0)

const fileTime = computed(() => formatTime(currentFile.value?.updatedAt))

const sortedBlocks = computed(() => {
  if (!currentFile.value?.blocks) return []
  return [...currentFile.value.blocks].sort((a, b) => a.order - b.order)
})

// Visible blocks: filter by search query
const visibleBlocks = computed(() => {
  if (!hasQuery.value) return sortedBlocks.value
  const q = store.searchQuery.trim()
  return sortedBlocks.value.filter(b => blockMatchesQuery(b, q))
})

const wordCount = computed(() => {
  if (!currentFile.value) return 0
  if (currentFile.value.type === 'markdown') return (currentFile.value.content || '').length
  return (currentFile.value.blocks || []).flatMap(b => (b.items || []).map(i => i.text)).join('').length
})

// Highlight helper
function hlText(text) {
  if (!text) return ''
  if (!hasQuery.value) return text.replace(/</g, '&lt;')
  return highlightText(text.replace(/</g, '&lt;'), store.searchQuery.trim())
}

// Markdown rendering
function renderMd(text) {
  if (!text) return '<p style="color:var(--text-muted)">暂无内容</p>'
  let h = text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
  return '<p>' + h + '</p>'
}

function onMdInput(val) {
  if (currentFile.value) currentFile.value.content = val
}

function toggleMdEdit() {
  store.mdEditMode = !store.mdEditMode
}

// Markdown split pane resize
function startMdResize(e) {
  const wrapper = contentBodyRef.value?.querySelector('.md-wrapper')
  if (!wrapper) return
  const startX = e.clientX
  const rect = wrapper.getBoundingClientRect()
  const startRatio = 0.5

  function onMove(ev) {
    const dx = ev.clientX - startX
    const ratio = Math.max(0.2, Math.min(0.8, startRatio + dx / rect.width))
    mdEditFlex.value = (1 - ratio) / ratio
    wrapper.style.gridTemplateColumns = `${ratio * 100}% auto 1fr`
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// Block operations
function toggleBlock(block) {
  block.collapsed = !block.collapsed
}

function doExpandAll() {
  if (currentFile.value?.blocks) {
    currentFile.value.blocks.forEach(b => b.collapsed = false)
    showToast('已展开全部')
  }
}

function doCollapseAll() {
  if (currentFile.value?.blocks) {
    currentFile.value.blocks.forEach(b => b.collapsed = true)
    showToast('已折叠全部')
  }
}

function doCopyAll() {
  if (!currentFile.value) return
  let text = ''
  if (currentFile.value.type === 'markdown') {
    text = currentFile.value.content || ''
  } else {
    text = (currentFile.value.blocks || []).map(b =>
      `[${b.title}]\n${(b.items || []).map(i => i.text).filter(Boolean).join('\n')}`
    ).filter(s => s.length > 10).join('\n\n')
  }
  navigator.clipboard?.writeText(text).then(() => showToast('已复制全部')).catch(() => showToast('复制失败'))
}

function copyBlock(block) {
  const text = (block.items || []).map(i => i.text).filter(Boolean).join('\n')
  if (!text) { showToast('内容为空'); return }
  navigator.clipboard?.writeText(text).then(() => showToast('已复制: ' + block.title)).catch(() => showToast('复制失败'))
}

function copyText(text, label) {
  navigator.clipboard?.writeText(text).then(() => showToast('已复制: ' + (label || ''))).catch(() => showToast('复制失败'))
}

function handleAddBlock() {
  const block = storeAddBlock()
  if (!block) return
  nextTick(() => {
    editingBlockId.value = block.id
    nextTick(() => {
      const ta = contentBodyRef.value?.querySelector('.block-textarea')
      if (ta) {
        ta.focus()
        ta.style.height = '120px'
      }
    })
  })
}

function startEdit(block) {
  editingBlockId.value = block.id
  nextTick(() => {
    const ta = contentBodyRef.value?.querySelector('.block-textarea')
    if (ta) {
      ta.focus()
      ta.style.height = Math.max(120, ta.scrollHeight) + 'px'
      ta.setSelectionRange(ta.value.length, ta.value.length)
    }
  })
}

function saveBlockText(block, item, e) {
  item.text = e.target.value
  if (currentFile.value) currentFile.value.updatedAt = Date.now()
  editingBlockId.value = null
}

function autoGrow(el) {
  el.style.height = 'auto'
  el.style.height = Math.max(120, el.scrollHeight) + 'px'
}

function finishBlockRename(block, e) {
  const val = e.target.value.trim()
  if (val) block.title = val
  renamingBlockId.value = null
}

function openBlockMenu(e, block) {
  store.blockMenuX = Math.min(e.clientX || e.pageX, window.innerWidth - 180)
  store.blockMenuY = Math.min(e.clientY || e.pageY, window.innerHeight - 180)
  store.blockMenuTarget = block.id
  store.blockMenuVisible = true
}

function unlockApi(item) {
  store.lockFileId = store.currentFile
  store.lockMode = 'unlock'
  store.lockCallback = () => { item._locked = false }
  store.lockVisible = true
}

// === Keyboard shortcuts ===
function handleKeyDown(e) {
  // Don't handle shortcuts when typing in input/textarea
  const tag = e.target.tagName
  const isEditing = tag === 'INPUT' || tag === 'TEXTAREA'

  // Escape: close popups
  if (e.key === 'Escape') {
    if (store.lockVisible) { store.lockVisible = false; return }
    if (store.ctxVisible) { store.ctxVisible = false; return }
    if (store.blockMenuVisible) { store.blockMenuVisible = false; return }
    if (editingBlockId.value) { editingBlockId.value = null; return }
    if (store.searchQuery) { store.searchQuery = ''; return }
    if (store.mdEditMode) { store.mdEditMode = false; return }
    return
  }

  // Ctrl+B: toggle sidebar
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault()
    store.sidebarCollapsed = !store.sidebarCollapsed
    return
  }

  // Don't handle other shortcuts while editing text
  if (isEditing) return

  // Ctrl+N: new file
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault()
    const file = storeAddFile()
    if (file) {
      nextTick(() => {
        storeSelectFile(file.id)
        nextTick(() => {
          const display = document.querySelector('.block-text-display')
          if (display) display.click()
        })
      })
    }
    return
  }

  // Ctrl+Shift+N: new block
  if (e.ctrlKey && e.shiftKey && e.key === 'N') {
    e.preventDefault()
    handleAddBlock()
    return
  }

  // Ctrl+/: focus search
  if (e.ctrlKey && e.key === '/') {
    e.preventDefault()
    store.filePanelCollapsed = false
    nextTick(() => {
      const searchInput = document.querySelector('.search-input')
      if (searchInput) searchInput.focus()
    })
    return
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// Listen for block rename trigger from BlockMenu
watch(() => store.blockMenuVisible, (v) => {
  if (!v && store.blockMenuTarget) {
    // Menu was closed
  }
})

// Expose renamingBlockId for external trigger
defineExpose({ renamingBlockId, editingBlockId })
</script>

<style scoped>
.content-panel {
  display: flex; flex-direction: column;
  background: var(--surface); overflow: hidden; min-width: 0;
}

/* Header */
.content-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 32px; border-bottom: 1px solid var(--border-light);
  min-height: 56px; flex-shrink: 0; gap: 12px;
}
.content-header-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
.content-breadcrumb {
  font-size: 12px; color: var(--text-muted); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.bc-cat { color: var(--text-muted); }
.bc-sep { margin: 0 6px; color: var(--border); }
.bc-file { color: var(--text-secondary); }
.bc-time { color: var(--text-muted); font-size: 11px; }

.toggle-btn {
  width: 28px; height: 28px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer;
  color: var(--text-muted); border-radius: 6px; transition: all 0.15s;
}
.toggle-btn:hover { background: var(--surface-hover); color: var(--text-primary); }

.content-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.action-btn {
  display: flex; align-items: center; gap: 5px; padding: 6px 11px;
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); cursor: pointer; font-family: inherit;
  font-size: 12px; color: var(--text-secondary); transition: all 0.15s; white-space: nowrap;
}
.action-btn:hover { border-color: var(--text-muted); color: var(--text-primary); }
.action-btn.primary { background: var(--text-primary); color: var(--bg); border-color: var(--text-primary); }
.action-btn.primary:hover { background: var(--text-secondary); }

/* Content body */
.content-body {
  flex: 1; overflow-y: auto; padding: 32px 40px 80px;
}
.content-layout { max-width: 800px; }
.content-file-title {
  font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 300;
  color: var(--text-primary); margin-bottom: 8px; padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

/* Blocks */
.content-block {
  margin-bottom: 20px;
  animation: fadeIn 0.2s ease;
}
.block-header {
  display: flex; align-items: center; gap: 8px; padding: 10px 0;
  border-bottom: 1px solid var(--border-light); margin-bottom: 8px;
  cursor: pointer; user-select: none;
}
.block-toggle {
  width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); transition: transform 0.25s ease; flex-shrink: 0;
}
.block-toggle.collapsed { transform: rotate(-90deg); }
.block-title {
  font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 500;
  color: var(--text-primary); flex: 1;
}
.block-star { color: var(--accent); margin-right: 4px; }
.block-title-input {
  flex: 1; border: none; background: var(--surface-hover);
  font-family: 'Cormorant Garamond', serif; font-size: 16px; font-weight: 500;
  color: var(--text-primary); outline: none; padding: 2px 6px; border-radius: 4px;
}
.block-actions {
  display: flex; gap: 2px; transition: opacity 0.15s;
}

.block-btn {
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer;
  color: var(--text-muted); border-radius: 4px; transition: all 0.1s;
}
.block-btn:hover { background: var(--surface-hover); color: var(--text-primary); }

/* Block content transition */
.block-content {
  padding-left: 22px;
  overflow: hidden;
}
.block-expand-enter-active, .block-expand-leave-active {
  transition: all 0.25s ease;
}
.block-expand-enter-from, .block-expand-leave-to {
  opacity: 0; max-height: 0;
}
.block-expand-enter-to, .block-expand-leave-from {
  opacity: 1; max-height: 800px;
}

.block-text-wrap { margin-bottom: 8px; }
.block-text-display {
  white-space: pre-wrap; word-break: break-word;
  font-size: 14px; line-height: 1.8;
  color: var(--text-secondary); padding: 8px 0;
  min-height: 40px; cursor: text;
}
.block-text-display:empty::before {
  content: '点击编辑添加内容...';
  color: var(--text-muted); font-style: italic;
}
.block-textarea {
  width: 100%; min-height: 120px; border: none; background: transparent;
  font-family: 'DM Sans', sans-serif; font-size: 14px; line-height: 1.8;
  color: var(--text-primary); resize: none; outline: none; padding: 8px 0;
}
.block-textarea::placeholder { color: var(--text-muted); }

/* Add block */
.add-block-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 16px; margin-top: 16px; border: 1px dashed var(--border);
  border-radius: var(--radius); cursor: pointer; color: var(--text-muted);
  font-size: 13px; transition: all 0.15s; background: none; font-family: inherit; width: 100%;
}
.add-block-btn:hover {
  border-color: var(--accent); color: var(--accent); background: var(--accent-light);
}

/* Search highlight */
:deep(.search-hl) {
  background: #fef08a;
  color: inherit;
  padding: 1px 2px;
  border-radius: 2px;
}

/* Search no results */
.search-no-blocks {
  text-align: center; padding: 40px 0; color: var(--text-muted); font-size: 13px;
}

/* API blocks */
.api-block {
  position: relative; background: #1a1814; border-radius: var(--radius);
  padding: 14px 18px; margin: 8px 0; overflow: hidden;
}
.api-block.locked .api-inner { filter: blur(6px); user-select: none; pointer-events: none; }
.api-block.locked .api-unlock-overlay { opacity: 1; pointer-events: auto; }
.api-inner { transition: filter 0.3s; }
.api-unlock-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(26,24,20,0.85); border-radius: var(--radius);
  opacity: 0; pointer-events: none; transition: opacity 0.2s;
}
.api-unlock-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 18px;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
  border-radius: var(--radius); color: #e8e5e0; cursor: pointer;
  font-family: inherit; font-size: 13px; transition: all 0.15s;
}
.api-unlock-btn:hover { background: rgba(255,255,255,0.2); }
.api-label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
  color: #a09890; margin-bottom: 4px;
}
.api-value {
  font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #e8e5e0;
  display: flex; align-items: center; justify-content: space-between;
}
.api-copy {
  padding: 4px 10px; background: rgba(255,255,255,0.08); border: none;
  border-radius: 4px; color: #a09890; cursor: pointer; font-size: 11px;
  transition: all 0.1s;
}
.api-copy:hover { background: var(--accent); color: white; }

/* Markdown */
.md-wrapper {
  display: grid; grid-template-columns: 1fr; gap: 0;
  max-width: 800px;
}
.md-wrapper.editing {
  grid-template-columns: 1fr auto 1fr; gap: 0; max-width: 1200px;
}
.md-preview-pane { min-width: 0; padding-right: 16px; }
.md-edit-pane { min-width: 0; padding-left: 16px; }

/* Markdown resizer */
.md-resizer {
  width: 6px; cursor: col-resize; position: relative;
  background: var(--border); border-radius: 3px;
  transition: background 0.15s; flex-shrink: 0;
}
.md-resizer:hover, .md-resizer:active {
  background: var(--accent);
}

.md-source {
  width: 100%; min-height: 500px; border: 1px solid var(--border);
  border-radius: var(--radius); background: var(--bg);
  font-family: 'JetBrains Mono', monospace; font-size: 13px;
  line-height: 1.7; color: var(--text-primary); resize: vertical;
  outline: none; padding: 16px;
}
.md-source:focus { border-color: var(--accent); }

/* Markdown rendered */
.md-content :deep(h1), .md-content :deep(h2), .md-content :deep(h3) {
  font-family: 'Cormorant Garamond', serif; font-weight: 500;
  color: var(--text-primary); margin: 1.5em 0 0.6em;
}
.md-content :deep(h1) { font-size: 24px; }
.md-content :deep(h2) { font-size: 20px; }
.md-content :deep(h3) { font-size: 17px; }
.md-content :deep(p) { margin-bottom: 1em; line-height: 1.8; }
.md-content :deep(code) {
  font-family: 'JetBrains Mono', monospace; font-size: 0.9em;
  background: var(--bg); padding: 2px 6px; border-radius: 4px; color: var(--accent);
}
.md-content :deep(pre) {
  background: #1a1814; border-radius: var(--radius);
  padding: 16px; margin: 1em 0; overflow-x: auto;
}
.md-content :deep(pre code) { background: none; padding: 0; color: #e8e5e0; font-size: 13px; }
.md-content :deep(ul), .md-content :deep(ol) { padding-left: 1.5em; margin-bottom: 1em; }
.md-content :deep(li) { margin-bottom: 0.4em; line-height: 1.7; }
.md-content :deep(blockquote) {
  border-left: 3px solid var(--accent); padding-left: 16px;
  margin: 1em 0; color: var(--text-muted); font-style: italic;
}

/* Empty state */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; min-height: 300px; color: var(--text-muted); text-align: center; gap: 14px;
}
.empty-state p { font-size: 14px; }
.empty-hint { font-size: 12px; opacity: 0.6; }

/* Word count */
.word-count {
  position: fixed; bottom: 16px; right: 24px; font-size: 11px;
  color: var(--text-muted); background: var(--surface);
  padding: 4px 10px; border-radius: 20px; border: 1px solid var(--border-light);
  z-index: 100;
}
</style>
