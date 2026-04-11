<template>
  <div class="user-center" :class="{ expanded: !store.sidebarCollapsed }">
    <!-- Collapsed: just avatar -->
    <div v-if="store.sidebarCollapsed" class="uc-avatar-mini" @click="store.sidebarCollapsed = false" title="用户中心">
      <div class="uc-avatar" :style="avatarStyle">{{ initials }}</div>
    </div>

    <!-- Expanded: full user bar -->
    <div v-else class="uc-bar" @click="showPanel = !showPanel">
      <div class="uc-avatar" :style="avatarStyle">{{ initials }}</div>
      <div class="uc-info">
        <span class="uc-name">{{ userName || '未设置昵称' }}</span>
        <span class="uc-meta">{{ fileStats }}</span>
      </div>
      <svg class="uc-chevron" :class="{ open: showPanel }" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 15l7-7 7 7"/>
      </svg>
    </div>

    <!-- Settings panel -->
    <Transition name="panel">
      <div v-if="showPanel && !store.sidebarCollapsed" class="uc-panel">
        <div class="uc-section">
          <div class="uc-section-title">用户信息</div>
          <div class="uc-field">
            <label>昵称</label>
            <input class="uc-input" v-model="userName" placeholder="输入昵称" @blur="saveUserName" />
          </div>
        </div>

        <div class="uc-section">
          <div class="uc-section-title">数据统计</div>
          <div class="uc-stats">
            <div class="uc-stat">
              <span class="stat-num">{{ stats.categories }}</span>
              <span class="stat-label">分类</span>
            </div>
            <div class="uc-stat">
              <span class="stat-num">{{ stats.files }}</span>
              <span class="stat-label">文件</span>
            </div>
            <div class="uc-stat">
              <span class="stat-num">{{ stats.locked }}</span>
              <span class="stat-label">已加密</span>
            </div>
          </div>
        </div>

        <div class="uc-section">
          <div class="uc-section-title">外观</div>
          <div class="uc-field">
            <label>字体大小</label>
            <div class="uc-font-size">
              <button class="fs-btn" :class="{ active: fontSize === 'small' }" @click="setFontSize('small')">小</button>
              <button class="fs-btn" :class="{ active: fontSize === 'medium' }" @click="setFontSize('medium')">中</button>
              <button class="fs-btn" :class="{ active: fontSize === 'large' }" @click="setFontSize('large')">大</button>
            </div>
          </div>
        </div>

        <div class="uc-section">
          <div class="uc-section-title">密码管理</div>
          <div class="uc-pw-actions">
            <button class="uc-pw-btn" @click="handleSetPassword">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              {{ hasGlobalPw ? '更换密码' : '设置密码' }}
            </button>
            <button class="uc-pw-btn" v-if="hasGlobalPw" @click="handleDeletePassword">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              删除密码
            </button>
          </div>
          <div class="uc-pw-hint" v-if="hasGlobalPw">已设置全局密码，保护 {{ lockedCount }} 个文件</div>
          <div class="uc-pw-hint" v-else>未设置密码，文件无法加密保护</div>
        </div>

        <div class="uc-section">
          <div class="uc-section-title">数据</div>
          <button class="uc-pw-btn uc-reset-btn" @click="handleReset">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            恢复默认数据
          </button>
          <div class="uc-pw-hint">将清除所有数据并恢复为初始状态</div>
        </div>

        <div class="uc-section">
          <div class="uc-section-title">快捷键</div>
          <div class="uc-shortcuts">
            <div class="uc-shortcut"><span class="sc-key">Ctrl+N</span><span>新建文件</span></div>
            <div class="uc-shortcut"><span class="sc-key">Ctrl+B</span><span>切换侧栏</span></div>
            <div class="uc-shortcut"><span class="sc-key">Ctrl+/</span><span>聚焦搜索</span></div>
            <div class="uc-shortcut"><span class="sc-key">Ctrl+⇧+N</span><span>新内容块</span></div>
            <div class="uc-shortcut"><span class="sc-key">Esc</span><span>关闭弹窗</span></div>
          </div>
        </div>

        <div class="uc-section">
          <div class="uc-section-title">关于</div>
          <div class="uc-about">
            <span class="uc-version">Quill v4</span>
            <span class="uc-desc">轻量笔记工具 · Tauri + Vue 3</span>
            <span class="uc-author">作者：Sky白木</span>
            <span class="uc-email">skybaimu@gmail.com</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { store, hasGlobalPassword, removeGlobalPassword } from '../stores/useStore.js'

const showPanel = ref(false)

const userName = ref(localStorage.getItem('quill-username') || '')
const fontSize = ref(localStorage.getItem('quill-fontsize') || 'medium')

const initials = computed(() => {
  if (!userName.value) return '?'
  return userName.value.charAt(0).toUpperCase()
})

const avatarStyle = computed(() => {
  const colors = ['#c45d3a', '#4a8c6f', '#5b7bb5', '#8b6fad', '#c4884a', '#5a9ea0']
  const idx = userName.value ? userName.value.charCodeAt(0) % colors.length : 0
  return { background: colors[idx] }
})

const stats = computed(() => {
  let files = 0, locked = 0
  for (const catId in store.files) {
    const arr = store.files[catId] || []
    files += arr.length
    if (catId === 'c2') {
      locked += arr.length // 密码类别里的文件全都是加密的
    }
  }
  return { categories: store.categories.length, files, locked }
})

const hasGlobalPw = computed(() => hasGlobalPassword())
const lockedCount = computed(() => stats.value.locked)

function handleSetPassword() {
  if (hasGlobalPw.value) {
    // 如果已经有密码，先验证旧密码
    store.lockFileId = '__global__'
    store.lockMode = 'unlock'
    store.lockCallback = () => {
      // 验证成功后，弹出设置新密码
      setTimeout(() => {
        store.lockFileId = '__global__'
        store.lockMode = 'setup'
        store.lockCallback = () => {
          showToast('全局密码已成功更新')
        }
        store.lockVisible = true
      }, 300)
    }
    store.lockVisible = true
  } else {
    // 第一次设置密码
    store.lockFileId = '__global__'
    store.lockMode = 'setup'
    store.lockCallback = () => {
      showToast('全局密码设置成功')
    }
    store.lockVisible = true
  }
}

function handleDeletePassword() {
  // 需要先验证当前密码
  store.lockFileId = '__global__'
  store.lockMode = 'unlock'
  store.lockCallback = () => {
    removeGlobalPassword()
    // 同时解锁所有文件
    for (const catId in store.files) {
      for (const f of store.files[catId]) {
        f.locked = false
      }
    }
    showToast('已删除全局密码，所有文件已解锁')
  }
  store.lockVisible = true
}

function handleReset() {
  if (!confirm('确定要恢复默认数据吗？\n所有分类、文件和密码将被清除，无法恢复。')) return
  localStorage.removeItem('quill-data')
  localStorage.removeItem('quill-username')
  localStorage.removeItem('quill-fontsize')
  location.reload()
}

const fileStats = computed(() => {
  return `${stats.value.files} 个文件`
})

function saveUserName() {
  localStorage.setItem('quill-username', userName.value)
}

function setFontSize(size) {
  fontSize.value = size
  localStorage.setItem('quill-fontsize', size)
  const root = document.documentElement
  switch (size) {
    case 'small': root.style.setProperty('--app-font-size', '12px'); break
    case 'medium': root.style.setProperty('--app-font-size', '14px'); break
    case 'large': root.style.setProperty('--app-font-size', '16px'); break
  }
}

// Initialize font size on mount
watch(() => true, () => {
  setFontSize(fontSize.value)
}, { immediate: true })

// Close panel when sidebar collapses
watch(() => store.sidebarCollapsed, (v) => {
  if (v) showPanel.value = false
})
</script>

<style scoped>
.user-center {
  flex-shrink: 0;
  border-top: 1px solid var(--border-light);
  position: relative;
  width: 100%;
}

/* Avatar mini (collapsed) */
.uc-avatar-mini {
  display: flex; justify-content: center; padding: 12px 0;
  cursor: pointer;
}

.uc-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 14px; font-weight: 500; flex-shrink: 0;
  transition: transform 0.15s;
}
.uc-avatar:hover { transform: scale(1.05); }

/* Bar (expanded) */
.uc-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; cursor: pointer; transition: background 0.15s;
}
.uc-bar:hover { background: var(--surface-hover); }

.uc-info {
  flex: 1; min-width: 0; display: flex; flex-direction: column;
}
.uc-name {
  font-size: 13px; color: var(--text-primary); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.uc-meta { font-size: 10px; color: var(--text-muted); }

.uc-chevron {
  color: var(--text-muted); transition: transform 0.2s; flex-shrink: 0;
}
.uc-chevron.open { transform: rotate(0deg); }
.uc-chevron:not(.open) { transform: rotate(180deg); }

/* Panel */
.uc-panel {
  padding: 0 16px 12px; max-height: 400px; overflow-y: auto;
  border-top: 1px solid var(--border-light);
}

.panel-enter-active, .panel-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.panel-enter-from, .panel-leave-to {
  opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0;
}
.panel-enter-to, .panel-leave-from {
  opacity: 1; max-height: 400px;
}

.uc-section { padding: 12px 0; border-bottom: 1px solid var(--border-light); }
.uc-section:last-child { border-bottom: none; }
.uc-section-title {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--text-muted); margin-bottom: 10px;
}

.uc-field { margin-bottom: 8px; }
.uc-field label {
  display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;
}
.uc-input {
  width: 100%; padding: 7px 10px; border: 1px solid var(--border); border-radius: 6px;
  font-family: inherit; font-size: 13px; background: var(--surface); color: var(--text-primary);
}
.uc-input:focus { outline: none; border-color: var(--accent); }

.uc-font-size { display: flex; gap: 4px; }
.fs-btn {
  flex: 1; padding: 6px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--surface); cursor: pointer; font-family: inherit;
  font-size: 12px; color: var(--text-muted); transition: all 0.15s;
}
.fs-btn.active { background: var(--text-primary); color: var(--bg); border-color: var(--text-primary); }
.fs-btn:hover:not(.active) { border-color: var(--text-muted); }

/* Stats */
.uc-stats { display: flex; gap: 12px; }
.uc-stat {
  flex: 1; text-align: center; padding: 8px 0;
  background: var(--surface-hover); border-radius: 6px;
}
.stat-num { display: block; font-family: 'Cormorant Garamond', serif; font-size: 20px; color: var(--text-primary); }
.stat-label { font-size: 10px; color: var(--text-muted); }

/* Shortcuts */
.uc-shortcuts { display: flex; flex-direction: column; gap: 6px; }
.uc-shortcut {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 12px; color: var(--text-secondary);
}
.sc-key {
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  background: var(--surface-hover); padding: 2px 8px; border-radius: 4px;
  color: var(--text-muted); border: 1px solid var(--border-light);
}

/* About */
.uc-about { display: flex; flex-direction: column; gap: 2px; }
.uc-version { font-size: 12px; font-weight: 500; color: var(--text-primary); }
.uc-desc { font-size: 11px; color: var(--text-muted); }
.uc-author { font-size: 11px; color: var(--text-secondary); margin-top: 4px; }
.uc-email { font-size: 11px; color: var(--accent); }

/* Password management */
.uc-pw-actions { display: flex; flex-direction: column; gap: 4px; }
.uc-pw-btn {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px;
  border: 1px solid var(--border); background: var(--surface); cursor: pointer;
  border-radius: 6px; font-family: inherit; font-size: 12px;
  color: var(--text-secondary); transition: all 0.15s;
}
.uc-pw-btn:hover { border-color: var(--accent); color: var(--accent); }
.uc-pw-hint { font-size: 10px; color: var(--text-muted); margin-top: 6px; }

/* Reset */
.uc-reset-btn { border-color: var(--danger); color: var(--danger); }
.uc-reset-btn:hover { background: var(--danger-light); }
</style>
