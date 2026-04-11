import { reactive, computed, watch, toRaw } from 'vue'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

const defaultData = {
  categories: [
    { id: 'c1', name: 'AI 提示词', icon: 'sparkle', pinned: true, order: 0 },
    { id: 'c2', name: '密码 & API Keys', icon: 'key', pinned: false, order: 1 },
    { id: 'c3', name: '想法记录', icon: 'bulb', pinned: false, order: 2 },
    { id: 'c4', name: 'Markdown', icon: 'doc', pinned: false, order: 3 }
  ],
  files: {
    c1: [
      {
        id: 'f1', name: '图像生成提示词', tag: 'Prompt', pinned: true, starred: false,
        order: 0, locked: false, type: 'text', updatedAt: Date.now(),
        blocks: [
          {
            id: 'b1', title: 'Midjourney 基础', collapsed: false, starred: false, order: 0,
            items: [
              { id: 'i1', label: '写实人像', text: 'professional portrait photography, a young woman with natural makeup, soft window light, shallow depth of field, shot on Canon EOS R5, 85mm f/1.4 --ar 3:4 --style raw --s 250', type: 'text' },
              { id: 'i2', label: '产品摄影', text: 'luxury product photography, premium skincare bottle on marble surface, dramatic side lighting, water droplets, dark moody atmosphere --ar 16:9 --style raw', type: 'text' }
            ]
          },
          {
            id: 'b2', title: 'DALL-E 3', collapsed: false, starred: false, order: 1,
            items: [
              { id: 'i3', label: '插画风格', text: 'A whimsical illustration of a cozy coffee shop interior, warm golden lighting, bookshelves lining the walls, a cat sleeping on the counter, soft watercolor style', type: 'text' }
            ]
          }
        ]
      }
    ],
    c2: [
      {
        id: 'f2', name: '服务密钥', tag: 'Secret', pinned: true, starred: false,
        order: 0, locked: true, type: 'text', updatedAt: Date.now(),
        blocks: [
          {
            id: 'b3', title: 'AI 服务', collapsed: false, starred: false, order: 0,
            items: [
              { id: 'i4', label: 'OpenAI', text: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'api', _locked: true },
              { id: 'i5', label: 'Anthropic', text: 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'api', _locked: true }
            ]
          }
        ]
      }
    ],
    c3: [
      {
        id: 'f3', name: '产品想法', tag: 'Idea', pinned: false, starred: false,
        order: 0, locked: false, type: 'text', updatedAt: Date.now(),
        blocks: [
          {
            id: 'b4', title: '核心概念', collapsed: false, starred: false, order: 0,
            items: [
              { id: 'i6', label: '目标用户', text: '独立开发者和小团队，需要快速原型和 MVP 工具。\n\n核心痛点：\n- 从想法到产品周期太长\n- 设计和开发脱节', type: 'text' }
            ]
          }
        ]
      }
    ],
    c4: [
      {
        id: 'f4', name: 'README 模板', tag: 'Markdown', pinned: false, starred: false,
        order: 0, locked: false, type: 'markdown', updatedAt: Date.now(),
        content: '# 项目名称\n\n## 简介\n这是一个示例项目\n\n## 功能\n- 功能1\n- 功能2\n\n## 安装\n```bash\nnpm install\n```\n\n## 使用\n```javascript\nimport { something } from \'package\'\n```'
      }
    ]
  },
  passwords: {}
}

// Load from localStorage or use default
function loadData() {
  try {
    const saved = localStorage.getItem('quill-data')
    if (saved) return JSON.parse(saved)
  } catch (e) { /* ignore */ }
  return JSON.parse(JSON.stringify(defaultData))
}

const store = reactive({
  ...loadData(),
  // UI state
  currentCat: loadData().categories[0]?.id || 'c1',
  currentFile: null,
  sidebarCollapsed: false,
  filePanelCollapsed: false,
  searchScope: 'file',
  searchQuery: '',
  mdEditMode: false,
  // Context menu state
  ctxVisible: false,
  ctxX: 0,
  ctxY: 0,
  ctxTarget: null,
  ctxType: null, // 'file' | 'category'
  // Block context menu
  blockMenuVisible: false,
  blockMenuX: 0,
  blockMenuY: 0,
  blockMenuTarget: null,
  // Lock overlay
  lockVisible: false,
  lockMode: 'unlock', // 'unlock' | 'setup'
  lockFileId: null,
  lockCallback: null,
  // Toast
  toastVisible: false,
  toastMessage: '',
  toastTimer: null,
  // Global lock state
  globalUnlockedUntil: 0
})

export function isPasswordFile(id) {
  return store.files['c2']?.some(f => f.id === id) || false
}

export function isGlobalUnlocked() {
  return Date.now() < store.globalUnlockedUntil
}

export function unlockGlobal() {
  store.globalUnlockedUntil = Date.now() + 30 * 60 * 1000 // 30 minutes
}

export function lockGlobal() {
  store.globalUnlockedUntil = 0
}

// Auto-save to localStorage
watch(() => {
  const { categories, files, passwords } = store
  return { categories, files, passwords }
}, (val) => {
  localStorage.setItem('quill-data', JSON.stringify(val))
}, { deep: true })

// Computed helpers
export function getSortedCategories() {
  return [...store.categories].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
    return a.order - b.order
  })
}

export function getSortedFiles(catId) {
  const files = store.files[catId] || []
  return [...files].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1
    return a.order - b.order
  })
}

export function findFile(id) {
  for (const catId in store.files) {
    const f = store.files[catId].find(f => f.id === id)
    if (f) return f
  }
  return null
}

export function getCurrentCat() {
  return store.categories.find(c => c.id === store.currentCat)
}

export function getFileCount(catId) {
  return (store.files[catId] || []).length
}

export function getPreview(file, query) {
  if (!file) return ''
  if (file.type === 'markdown') {
    const c = file.content || ''
    return c.substring(0, 40).replace(/[#*`]/g, '') + (c.length > 40 ? '...' : '') || '空文件'
  }
  if (!file.blocks || !file.blocks.length) return '空文件'
  for (const b of file.blocks) {
    if (b.items && b.items.length) {
      const t = b.items[0].text || ''
      return t.substring(0, 40) + (t.length > 40 ? '...' : '')
    }
  }
  return '空文件'
}

// Escape regex special chars
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Highlight matching text in a string
export function highlightText(text, query) {
  if (!query || !text) return text
  const re = new RegExp(`(${escapeRegex(query)})`, 'gi')
  return text.replace(re, '<mark class="search-hl">$1</mark>')
}

// Check if a block matches the search query
export function blockMatchesQuery(block, query) {
  if (!query) return true
  const q = query.toLowerCase()
  if (block.title.toLowerCase().includes(q)) return true
  return (block.items || []).some(i =>
    (i.label || '').toLowerCase().includes(q) ||
    (i.text || '').toLowerCase().includes(q)
  )
}

// Format timestamp to relative time
export function formatTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return min + ' 分钟前'
  const hr = Math.floor(min / 60)
  if (hr < 24) return hr + ' 小时前'
  const day = Math.floor(hr / 24)
  if (day < 7) return day + ' 天前'
  const d = new Date(ts)
  return (d.getMonth() + 1) + '月' + d.getDate() + '日'
}

export function getWordCount(file) {
  if (!file) return 0
  if (file.type === 'markdown') return (file.content || '').length
  return (file.blocks || []).flatMap(b => (b.items || []).map(i => i.text)).join('').length
}

// Actions
export function selectCategory(id) {
  console.log(`[Store] selectCategory called with id: ${id}`)
  store.currentCat = id
  store.filePanelCollapsed = false
  store.searchQuery = ''
  
  const files = store.files[id] || []
  console.log(`[Store] category ${id} has ${files.length} files`)
  
  if (files.length > 0) {
    console.log(`[Store] Auto-selecting first file: ${files[0].id}`)
    // 直接设置 currentFile，不要走复杂的 selectFile 逻辑，这样右边就能拿到这个文件了
    // 如果是密码类别 (c2)，ContentPanel 会根据 !isGlobalUnlocked() 自己渲染锁屏遮罩
    store.currentFile = files[0].id
    store.mdEditMode = false
  } else {
    console.log(`[Store] Category empty, clearing currentFile`)
    store.currentFile = null
  }
}

export function selectFile(id) {
  console.log(`[Store] selectFile called with id: ${id}`)
  const file = findFile(id)
  if (!file) {
    console.log(`[Store] File not found`)
    return
  }

  // 对于密码类别下的文件，如果未解锁则不能选中
  const isC2 = isPasswordFile(id);

  console.log(`[Store] File info: isC2=${isC2}, isGlobalUnlocked=${isGlobalUnlocked()}`)

  // 如果是 C2 且未解锁，由于在 FilePanel 里面已经拦截弹窗了，
  // 理论上这里其实不应该被拦截，但为了安全起见，这里还是放行并设置 currentFile。
  // 因为如果拦住了，右侧面板就没有 currentFile，就会显示 empty state，而不是 locked state
  
  if (isC2 && isGlobalUnlocked()) {
     console.log(`[Store] Global unlocked, refreshing lock timer`)
     unlockGlobal()
  }

  console.log(`[Store] Setting currentFile to ${id}`)
  store.currentFile = id
  store.mdEditMode = false
}

export function addCategory() {
  const cat = {
    id: 'c' + uid(),
    name: '',
    icon: ['sparkle', 'bulb', 'doc'][Math.floor(Math.random() * 3)],
    pinned: false,
    order: store.categories.length
  }
  store.categories.push(cat)
  store.files[cat.id] = []
  store.currentCat = cat.id
  store.currentFile = null
  return cat
}

// Auto-assign tag based on category
function autoTag(catName) {
  if (!catName) return 'Note'
  const n = catName.toLowerCase()
  if (n.includes('提示') || n.includes('prompt')) return 'Prompt'
  if (n.includes('密码') || n.includes('key') || n.includes('secret')) return 'Secret'
  if (n.includes('想法') || n.includes('idea')) return 'Idea'
  if (n.includes('markdown') || n.includes('md')) return 'Markdown'
  return 'Note'
}

export function addFile() {
  const files = store.files[store.currentCat] || []
  const cat = getCurrentCat()
  const catName = cat ? cat.name : '未命名'
  const tag = autoTag(catName)
  const isMd = tag === 'Markdown'
  const file = {
    id: 'f' + uid(),
    name: catName + ' ' + (files.length + 1),
    tag,
    pinned: false,
    starred: false,
    order: files.length,
    locked: false,
    type: isMd ? 'markdown' : 'text',
    updatedAt: Date.now(),
    ...(isMd ? { content: '' } : {
      blocks: [{
        id: 'b' + uid(),
        title: '标题 1',
        collapsed: false,
        starred: false,
        order: 0,
        items: [{ id: 'i' + uid(), label: '', text: '', type: 'text' }]
      }]
    })
  }
  files.push(file)
  store.files[store.currentCat] = files
  store.currentFile = file.id
  store.mdEditMode = false
  return file
}

export function addBlock() {
  const file = findFile(store.currentFile)
  if (!file || !file.blocks) return null
  const block = {
    id: 'b' + uid(),
    title: '标题 ' + (file.blocks.length + 1),
    collapsed: false,
    starred: false,
    order: file.blocks.length,
    items: [{ id: 'i' + uid(), label: '', text: '', type: 'text' }]
  }
  file.blocks.push(block)
  file.updatedAt = Date.now()
  return block
}

export function deleteFile(fileId) {
  const arr = store.files[store.currentCat]
  if (!arr) return
  const idx = arr.findIndex(f => f.id === fileId)
  if (idx > -1) arr.splice(idx, 1)
  const rem = store.files[store.currentCat] || []
  store.currentFile = rem.length ? rem[0].id : null
}

export function deleteBlock(blockId) {
  const file = findFile(store.currentFile)
  if (!file || !file.blocks) return
  file.blocks = file.blocks.filter(b => b.id !== blockId)
  file.blocks.forEach((b, i) => b.order = i)
}

export function duplicateFile(fileId) {
  const file = findFile(fileId)
  if (!file) return
  const d = JSON.parse(JSON.stringify(file))
  d.id = 'f' + uid()
  d.name = file.name + ' (副本)'
  d.order = (store.files[store.currentCat] || []).length
  if (d.blocks) {
    d.blocks.forEach(b => {
      b.id = 'b' + uid()
      if (b.items) b.items.forEach(i => i.id = 'i' + uid())
    })
  }
  store.files[store.currentCat].push(d)
}

export function deleteCategory(catId) {
  // 默认四个分类不可删除
  const DEFAULT_CATS = new Set(['c1', 'c2', 'c3', 'c4'])
  if (DEFAULT_CATS.has(catId)) {
    showToast('默认分类不可删除')
    return false
  }
  if (store.categories.length <= 1) return false
  store.categories = store.categories.filter(c => c.id !== catId)
  delete store.files[catId]
  store.currentCat = store.categories[0].id
  const files = store.files[store.currentCat] || []
  store.currentFile = files.length ? files[0].id : null
  return true
}

export function swapOrder(arr, idA, idB) {
  const a = arr.find(x => x.id === idA)
  const b = arr.find(x => x.id === idB)
  if (a && b) [a.order, b.order] = [b.order, a.order]
}

// Export current file as JSON
export function exportFileAsJson(fileId) {
  const file = findFile(fileId)
  if (!file) return null
  return JSON.stringify(file, null, 2)
}

// Export current file as plain text
export function exportFileAsText(fileId) {
  const file = findFile(fileId)
  if (!file) return ''
  if (file.type === 'markdown') return file.content || ''
  return (file.blocks || []).map(b => {
    const title = `## ${b.title}`
    const items = (b.items || []).map(i => {
      if (i.label) return `### ${i.label}\n${i.text}`
      return i.text
    }).filter(Boolean).join('\n\n')
    return `${title}\n${items}`
  }).filter(s => s.length > 3).join('\n\n')
}

// Export all data as JSON
export function exportAllAsJson() {
  const { categories, files, passwords } = store
  const data = JSON.parse(JSON.stringify({ categories, files, passwords }))
  data._exportedAt = Date.now()
  data._version = 2
  return JSON.stringify(data, null, 2)
}

// Import data from JSON (merge or replace)
export function importFromJson(jsonStr, mode = 'merge') {
  try {
    const data = JSON.parse(jsonStr)
    if (!data.categories || !data.files) {
      showToast('无效的导入文件')
      return false
    }
    if (mode === 'replace') {
      store.categories = data.categories
      store.files = data.files
      store.passwords = data.passwords || {}
    } else {
      // Merge: add new categories and files
      for (const cat of data.categories) {
        if (!store.categories.find(c => c.id === cat.id)) {
          store.categories.push(cat)
        }
      }
      for (const catId in data.files) {
        if (!store.files[catId]) store.files[catId] = []
        for (const file of data.files[catId]) {
          if (!store.files[catId].find(f => f.id === file.id)) {
            store.files[catId].push(file)
          }
        }
      }
      Object.assign(store.passwords, data.passwords || {})
    }
    showToast('导入成功')
    return true
  } catch (e) {
    showToast('导入失败: 文件格式错误')
    return false
  }
}

// Trigger file download
export async function downloadFile(content, filename, mimeType = 'text/plain') {
  // Tauri 环境：弹出保存对话框
  if (typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.__TAURI__)) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeTextFile } = await import('@tauri-apps/plugin-fs')
      const ext = filename.includes('.') ? filename.split('.').pop() : 'txt'
      const filePath = await save({
        defaultPath: filename,
        filters: [{ name: 'All', extensions: [ext] }]
      })
      if (filePath) {
        await writeTextFile(filePath, content)
        showToast('已保存到: ' + filePath)
        return
      }
      return // 用户取消
    } catch (e) {
      console.error('[Tauri Export Error]', e)
      // 如果 Tauri API 失败，就继续往下走，用浏览器方式下载
    }
  }
  
  // 浏览器环境 / 或 Tauri API 调用失败的 Fallback
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
  showToast('已下载到浏览器默认目录')
}

// Read file as text
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// Toast
export function showToast(msg) {
  if (store.toastTimer) clearTimeout(store.toastTimer)
  store.toastMessage = msg
  store.toastVisible = true
  store.toastTimer = setTimeout(() => {
    store.toastVisible = false
  }, 2000)
}

// Global password helpers
const GLOBAL_PW_KEY = '__global__'

export function hasGlobalPassword() {
  return !!store.passwords[GLOBAL_PW_KEY]
}

export function getGlobalPasswordRecord() {
  return store.passwords[GLOBAL_PW_KEY] || null
}

export function setGlobalPassword(record) {
  store.passwords[GLOBAL_PW_KEY] = record
}

export function removeGlobalPassword() {
  delete store.passwords[GLOBAL_PW_KEY]
}

export { store, uid }
