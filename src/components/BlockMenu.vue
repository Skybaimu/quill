<template>
  <Teleport to="body">
    <div
      v-if="store.blockMenuVisible"
      class="ctx-overlay"
      @click="close"
      @contextmenu.prevent="close"
    ></div>
    <div
      class="ctx-menu"
      :class="{ show: store.blockMenuVisible }"
      :style="menuStyle"
      @click.stop
    >
      <div class="ctx-item" @click="doAction('rename')">
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        重命名
      </div>
      <div class="ctx-item" @click="doAction('star')">
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
        {{ targetBlock?.starred ? '取消收藏' : '收藏' }}
      </div>
      <div class="ctx-divider"></div>
      <div class="ctx-item danger" @click="doAction('delete')">
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        删除
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { store, findFile, deleteBlock, showToast } from '../stores/useStore.js'

const targetBlock = computed(() => {
  if (!store.blockMenuTarget || !store.currentFile) return null
  const file = findFile(store.currentFile)
  return file?.blocks?.find(b => b.id === store.blockMenuTarget) || null
})

const menuStyle = computed(() => ({
  left: store.blockMenuX + 'px',
  top: store.blockMenuY + 'px'
}))

function close() { store.blockMenuVisible = false }

function doAction(act) {
  const blockId = store.blockMenuTarget
  store.blockMenuVisible = false
  if (!blockId) return
  const file = findFile(store.currentFile)
  if (!file?.blocks) return
  const block = file.blocks.find(b => b.id === blockId)
  if (!block) return

  switch (act) {
    case 'rename': {
      const n = prompt('重命名内容块', block.title)
      if (n !== null && n.trim()) block.title = n.trim()
      break
    }
    case 'star':
      block.starred = !block.starred
      showToast(block.starred ? '已收藏' : '已取消收藏')
      break
    case 'delete':
      if (file.blocks.length <= 1) { showToast('至少保留一个内容块'); return }
      deleteBlock(blockId)
      showToast('已删除')
      break
  }
}
</script>

<style scoped>
.ctx-overlay { position: fixed; inset: 0; z-index: 999; }
.ctx-menu {
  position: fixed; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); padding: 6px;
  min-width: 160px; z-index: 1000; opacity: 0; transform: scale(0.95);
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
