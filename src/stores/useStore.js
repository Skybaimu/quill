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
  toastTimer: null
})

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

export function getPreview(file) {
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

export function getWordCount(file) {
  if (!file) return 0
  if (file.type === 'markdown') return (file.content || '').length
  return (file.blocks || []).flatMap(b => (b.items || []).map(i => i.text)).join('').length
}

// Actions
export function selectCategory(id) {
  store.currentCat = id
  store.filePanelCollapsed = false
  const files = store.files[id] || []
  if (files.length > 0) {
    selectFile(files[0].id)
  } else {
    store.currentFile = null
  }
}

export function selectFile(id) {
  const file = findFile(id)
  if (!file) return
  if (file.locked) {
    store.lockFileId = id
    store.lockMode = 'unlock'
    store.lockCallback = () => {
      store.currentFile = id
      store.mdEditMode = false
    }
    store.lockVisible = true
    return
  }
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

export function addFile() {
  const files = store.files[store.currentCat] || []
  const cat = getCurrentCat()
  const catName = cat ? cat.name : '未命名'
  const file = {
    id: 'f' + uid(),
    name: catName + (files.length + 1),
    tag: 'Note',
    pinned: false,
    starred: false,
    order: files.length,
    locked: false,
    type: 'text',
    updatedAt: Date.now(),
    blocks: [{
      id: 'b' + uid(),
      title: '标题 1',
      collapsed: false,
      starred: false,
      order: 0,
      items: [{ id: 'i' + uid(), label: '', text: '', type: 'text' }]
    }]
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

// Toast
export function showToast(msg) {
  if (store.toastTimer) clearTimeout(store.toastTimer)
  store.toastMessage = msg
  store.toastVisible = true
  store.toastTimer = setTimeout(() => {
    store.toastVisible = false
  }, 2000)
}

export { store, uid }
