<template>
  <Teleport to="body">
    <div
      v-if="store.ctxVisible"
      class="ctx-overlay"
      @click="close"
      @contextmenu.prevent="close"
    ></div>
    <div
      class="ctx-menu"
      :class="{ show: store.ctxVisible }"
      :style="menuStyle"
      @click.stop
    >
      <!-- File menu -->
      <template v-if="store.ctxType === 'file'">
        <div class="ctx-item" @click="doAction('rename')">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          重命名
        </div>
        <div class="ctx-item" @click="doAction('pin')">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
          {{ targetFile?.pinned ? '取消置顶' : '置顶' }}
        </div>
        <div class="ctx-item" @click="doAction('star')">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
          {{ targetFile?.starred ? '取消收藏' : '收藏' }}
        </div>
        <div class="ctx-item" @click="doAction('duplicate')">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          复制文件
        </div>
        <div class="ctx-item" @click="doAction('export')">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          导出
        </div>
        <div class="ctx-divider"></div>
        <div class="ctx-item" @click="doAction('lock')">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          {{ targetFile?.locked ? '取消密码保护' : '密码保护' }}
        </div>
        <div class="ctx-divider"></div>
        <div class="ctx-item danger" @click="doAction('delete')">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          删除
        </div>
      </template>

      <!-- Category menu -->
      <template v-if="store.ctxType === 'category'">
        <div class="ctx-item" @click="doAction('rename')">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          重命名
        </div>
        <div class="ctx-item" @click="doAction('pin')">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
          {{ targetCat?.pinned ? '取消置顶' : '置顶' }}
        </div>
        <div class="ctx-divider" v-if="!isDefaultCategory"></div>
        <div class="ctx-item danger" @click="doAction('delete')" v-if="!isDefaultCategory">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          删除
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { store, findFile, deleteFile, deleteCategory, duplicateFile, exportFileAsText, downloadFile, showToast } from '../stores/useStore.js'

const targetFile = computed(() => {
  if (store.ctxType !== 'file' || !store.ctxTarget) return null
  return findFile(store.ctxTarget)
})

const targetCat = computed(() => {
  if (store.ctxType !== 'category' || !store.ctxTarget) return null
  return store.categories.find(c => c.id === store.ctxTarget)
})

const isDefaultCategory = computed(() => {
  return ['c1', 'c2', 'c3', 'c4'].includes(store.ctxTarget)
})

const menuStyle = computed(() => ({
  left: store.ctxX + 'px',
  top: store.ctxY + 'px'
}))

function close() { store.ctxVisible = false }

function doAction(act) {
  store.ctxVisible = false
  const target = store.ctxTarget

  if (store.ctxType === 'file') {
    const file = findFile(target)
    if (!file) return
    switch (act) {
      case 'rename': {
        const n = prompt('重命名文件', file.name)
        if (n !== null && n.trim()) file.name = n.trim()
        break
      }
      case 'pin':
        file.pinned = !file.pinned
        showToast(file.pinned ? '已置顶' : '已取消置顶')
        break
      case 'star':
        file.starred = !file.starred
        showToast(file.starred ? '已收藏' : '已取消收藏')
        break
      case 'duplicate':
        duplicateFile(target)
        showToast('已复制')
        break
      case 'export': {
        const text = exportFileAsText(target)
        const ext = file.type === 'markdown' ? '.md' : '.txt'
        downloadFile(text, file.name + ext)
        showToast('已导出')
        break
      }
      case 'lock':
        if (file.locked) {
          file.locked = false
          delete store.passwords[target]
          showToast('已取消密码保护')
        } else {
          store.lockFileId = target
          store.lockMode = 'setup'
          store.lockCallback = () => {
            file.locked = true
            showToast('已设置密码保护')
          }
          store.lockVisible = true
        }
        break
      case 'delete':
        deleteFile(target)
        showToast('已删除')
        break
    }
  } else if (store.ctxType === 'category') {
    const cat = store.categories.find(c => c.id === target)
    if (!cat) return
    switch (act) {
      case 'rename': {
        const n = prompt('重命名分类', cat.name)
        if (n !== null && n.trim()) cat.name = n.trim()
        break
      }
      case 'pin':
        cat.pinned = !cat.pinned
        showToast(cat.pinned ? '已置顶' : '已取消置顶')
        break
      case 'delete':
        if (!deleteCategory(target)) showToast('至少保留一个分类')
        else showToast('已删除')
        break
    }
  }
}
</script>

<style scoped>
.ctx-overlay {
  position: fixed; inset: 0; z-index: 999;
}
.ctx-menu {
  position: fixed; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); padding: 6px;
  min-width: 180px; z-index: 1000; opacity: 0; transform: scale(0.95);
  pointer-events: none; transition: all 0.12s ease;
}
.ctx-menu.show { opacity: 1; transform: scale(1); pointer-events: auto; }
.ctx-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px;
  border-radius: 6px; cursor: pointer; font-size: 13px;
  color: var(--text-secondary); transition: all 0.1s;
}
.ctx-item:hover { background: var(--surface-hover); color: var(--text-primary); }
.ctx-item.danger { color: var(--danger); }
.ctx-item.danger:hover { background: var(--danger-light); }
.ctx-item svg { opacity: 0.6; flex-shrink: 0; }
.ctx-divider { height: 1px; background: var(--border-light); margin: 4px 8px; }
</style>
