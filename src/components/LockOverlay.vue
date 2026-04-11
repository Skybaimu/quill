<template>
  <div class="lock-overlay" :class="{ show: store.lockVisible }" @click.self="close">
    <template v-if="store.lockMode === 'unlock'">
      <div class="lock-title">安全验证</div>
      <div class="lock-subtitle">请输入密码</div>
      <div class="lock-tabs">
        <button class="lock-tab" :class="{ active: tab === 'pattern' }" @click="tab = 'pattern'">图案</button>
        <button class="lock-tab" :class="{ active: tab === 'pin' }" @click="tab = 'pin'">数字</button>
      </div>

      <!-- Pattern unlock -->
      <div v-show="tab === 'pattern'">
        <div class="pattern-wrap" ref="patternWrapEl">
          <div class="pattern-grid">
            <div
              v-for="i in 9" :key="i - 1"
              class="pattern-dot"
              :class="{ active: patternDots.includes(i - 1) }"
              @mousedown.prevent="startPattern(i - 1)"
              @mouseenter="continuePattern(i - 1)"
            ></div>
          </div>
          <canvas class="pattern-canvas" ref="patternCanvas" width="160" height="160"></canvas>
        </div>
        <div class="pattern-hint" :class="{ error: patternHintType === 'error', success: patternHintType === 'success' }">{{ patternHint }}</div>
      </div>

      <!-- PIN unlock -->
      <div v-show="tab === 'pin'">
        <div class="pin-display">
          <div v-for="i in 4" :key="i" class="pin-dot" :class="{ filled: pinValue.length >= i }"></div>
        </div>
        <div class="pin-pad">
          <template v-for="k in [1,2,3,4,5,6,7,8,9,'',0,'⌫']" :key="k">
            <div v-if="k === ''" class="pin-key empty"></div>
            <button v-else class="pin-key" :class="{ backspace: k === '⌫' }" @click="pinKey(k)">{{ k }}</button>
          </template>
        </div>
        <div class="pin-error">{{ pinError }}</div>
      </div>
    </template>

    <!-- Setup password -->
    <template v-else-if="store.lockMode === 'setup'">
      <div class="lock-title">设置密码</div>
      <div class="lock-subtitle">选择一种方式</div>
      <div class="lock-tabs" style="margin-bottom: 20px">
        <button class="lock-tab" :class="{ active: setupTab === 'pattern' }" @click="setupTab = 'pattern'">图案密码</button>
        <button class="lock-tab" :class="{ active: setupTab === 'pin' }" @click="setupTab = 'pin'">数字密码</button>
      </div>

      <!-- Setup pattern -->
      <div v-show="setupTab === 'pattern'">
        <div class="pattern-wrap" ref="setupPatternWrapEl">
          <div class="pattern-grid">
            <div
              v-for="i in 9" :key="i - 1"
              class="pattern-dot"
              :class="{ active: setupDots.includes(i - 1) }"
              @mousedown.prevent="startSetupPattern(i - 1)"
              @mouseenter="continueSetupPattern(i - 1)"
            ></div>
          </div>
          <canvas class="pattern-canvas" ref="setupPatternCanvas" width="160" height="160"></canvas>
        </div>
        <div class="pattern-hint" :class="{ error: setupHintType === 'error' }">{{ setupHint }}</div>
        <div v-if="setupConfirmed" class="pattern-hint success" style="display:block">请再次绘制确认</div>
      </div>

      <!-- Setup PIN -->
      <div v-show="setupTab === 'pin'">
        <input type="password" class="setup-input" v-model="setupPin1" placeholder="输入 4 位数字" maxlength="4" /><br/>
        <input type="password" class="setup-input" v-model="setupPin2" placeholder="再次输入确认" maxlength="4" /><br/>
        <button class="setup-btn" @click="saveSetupPin">设置密码</button>
      </div>
    </template>

    <div v-if="verifying" class="verifying-indicator">
      <div class="spinner"></div>
      <span>安全验证中...</span>
    </div>
    <button class="cancel-btn" @click="close">取消</button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { store, showToast } from '../stores/useStore.js'
import { createPasswordRecord, verifyPassword, isEncryptedRecord, migratePassword } from '../utils/crypto.js'

// 异步验证锁 — 防止 UI 阻塞
const verifying = ref(false)

const tab = ref('pattern')
const patternDots = ref([])
const patternDrawing = ref(false)
const patternHint = ref('连接至少 4 个点')
const patternHintType = ref('')
const patternCanvas = ref(null)
const patternWrapEl = ref(null)

const pinValue = ref('')
const pinError = ref('')

// Setup
const setupTab = ref('pattern')
const setupDots = ref([])
const setupDrawing = ref(false)
const setupConfirmed = ref(false)
const setupFirst = ref(null)
const setupHint = ref('绘制图案，至少 4 个点')
const setupHintType = ref('')
const setupPatternCanvas = ref(null)
const setupPin1 = ref('')
const setupPin2 = ref('')

watch(() => store.lockVisible, (v) => {
  if (v) {
    tab.value = 'pattern'
    setupTab.value = 'pattern'
    resetPattern()
    resetPin()
    resetSetup()
    verifying.value = false
    migrateOldPassword()
  }
})

/**
 * 检测并迁移旧格式密码（明文 → PBKDF2 哈希）
 * 旧格式：{ pattern: "012456" } / { pin: "1234" }
 * 新格式：{ type: "pattern", salt: "...", hash: "..." }
 */
async function migrateOldPassword() {
  if (!store.lockFileId) return
  const record = store.passwords[store.lockFileId]
  if (!record || isEncryptedRecord(record)) return
  // 旧格式，静默迁移
  const migrated = await migratePassword(record)
  if (migrated) {
    store.passwords[store.lockFileId] = migrated
  }
}

// Pattern unlock
function startPattern(idx) {
  if (verifying.value) return
  patternDrawing.value = true
  patternDots.value = [idx]
  drawPattern()
}

function continuePattern(idx) {
  if (patternDrawing.value && !patternDots.value.includes(idx)) {
    patternDots.value.push(idx)
    drawPattern()
  }
}

function drawPattern() {
  const canvas = patternCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 160, 160)
  if (patternDots.value.length > 0) {
    ctx.strokeStyle = '#c45d3a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    patternDots.value.forEach((idx, i) => {
      const x = (idx % 3) * 60 + 10
      const y = Math.floor(idx / 3) * 60 + 10
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }
}

// Listen for mouseup globally to end pattern
watch(patternDrawing, (drawing) => {
  if (drawing) {
    const handler = () => {
      patternDrawing.value = false
      endPattern()
      document.removeEventListener('mouseup', handler)
    }
    document.addEventListener('mouseup', handler)
  }
})

async function endPattern() {
  const p = patternDots.value.join('')
  if (p.length < 4) {
    patternHint.value = '至少 4 个点'
    patternHintType.value = 'error'
    setTimeout(resetPattern, 600)
    return
  }

  verifying.value = true
  patternHint.value = '验证中...'
  patternHintType.value = ''

  const record = store.passwords[store.lockFileId]
  let ok = false

  if (isEncryptedRecord(record)) {
    ok = await verifyPassword(p, record)
  } else if (record?.pattern !== undefined) {
    // 旧格式兼容
    ok = record.pattern === p
    if (ok) {
      // 迁移到新格式
      const migrated = await migratePassword(record)
      if (migrated) store.passwords[store.lockFileId] = migrated
    }
  }

  verifying.value = false

  if (ok) {
    patternHint.value = '验证成功'
    patternHintType.value = 'success'
    setTimeout(() => {
      close()
      if (store.lockCallback) store.lockCallback()
    }, 300)
  } else {
    patternHint.value = '密码错误'
    patternHintType.value = 'error'
    if (patternWrapEl.value) patternWrapEl.value.style.animation = 'shake 0.4s'
    setTimeout(() => {
      resetPattern()
      if (patternWrapEl.value) patternWrapEl.value.style.animation = ''
    }, 500)
  }
}

function resetPattern() {
  patternDots.value = []
  patternDrawing.value = false
  patternHint.value = '连接至少 4 个点'
  patternHintType.value = ''
  const canvas = patternCanvas.value
  if (canvas) canvas.getContext('2d').clearRect(0, 0, 160, 160)
}

// PIN unlock
function pinKey(k) {
  if (verifying.value) return
  if (k === '⌫') {
    pinValue.value = pinValue.value.slice(0, -1)
  } else if (pinValue.value.length < 4) {
    pinValue.value += k
    if (pinValue.value.length === 4) {
      setTimeout(verifyPin, 150)
    }
  }
}

async function verifyPin() {
  verifying.value = true
  const record = store.passwords[store.lockFileId]
  let ok = false

  if (isEncryptedRecord(record)) {
    ok = await verifyPassword(pinValue.value, record)
  } else if (record?.pin !== undefined) {
    // 旧格式兼容
    ok = record.pin === pinValue.value
    if (ok) {
      const migrated = await migratePassword(record)
      if (migrated) store.passwords[store.lockFileId] = migrated
    }
  }

  verifying.value = false

  if (ok) {
    close()
    if (store.lockCallback) store.lockCallback()
  } else {
    pinError.value = '密码错误'
    setTimeout(resetPin, 500)
  }
}

function resetPin() {
  pinValue.value = ''
  pinError.value = ''
}

// Setup pattern
function startSetupPattern(idx) {
  setupDrawing.value = true
  setupDots.value = [idx]
  drawSetupPattern()
}

function continueSetupPattern(idx) {
  if (setupDrawing.value && !setupDots.value.includes(idx)) {
    setupDots.value.push(idx)
    drawSetupPattern()
  }
}

function drawSetupPattern() {
  const canvas = setupPatternCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 160, 160)
  if (setupDots.value.length > 0) {
    ctx.strokeStyle = '#c45d3a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    setupDots.value.forEach((idx, i) => {
      const x = (idx % 3) * 60 + 10
      const y = Math.floor(idx / 3) * 60 + 10
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }
}

watch(setupDrawing, (drawing) => {
  if (drawing) {
    const handler = () => {
      setupDrawing.value = false
      endSetupPattern()
      document.removeEventListener('mouseup', handler)
    }
    document.addEventListener('mouseup', handler)
  }
})

async function endSetupPattern() {
  const p = setupDots.value.join('')
  if (p.length < 4) {
    setupHint.value = '至少 4 个点'
    setupHintType.value = 'error'
    setTimeout(resetSetup, 600)
    return
  }
  if (!setupConfirmed.value) {
    setupFirst.value = p
    setupConfirmed.value = true
    setupDots.value = []
    setupHint.value = '再次绘制确认'
    setupHintType.value = ''
    drawSetupPattern()
    return
  }
  if (setupFirst.value === p) {
    // 使用 PBKDF2 哈希存储
    if (store.lockFileId) {
      const record = await createPasswordRecord(p, 'pattern')
      store.passwords[store.lockFileId] = record
    }
    close()
    if (store.lockCallback) store.lockCallback()
    showToast('密码设置成功')
  } else {
    setupHint.value = '两次不一致'
    setupHintType.value = 'error'
    setTimeout(resetSetup, 800)
  }
}

function resetSetup() {
  setupDots.value = []
  setupDrawing.value = false
  setupConfirmed.value = false
  setupFirst.value = null
  setupHint.value = '绘制图案，至少 4 个点'
  setupHintType.value = ''
  const canvas = setupPatternCanvas.value
  if (canvas) canvas.getContext('2d').clearRect(0, 0, 160, 160)
  setupPin1.value = ''
  setupPin2.value = ''
}

async function saveSetupPin() {
  const p1 = setupPin1.value
  const p2 = setupPin2.value
  if (p1.length !== 4 || !/^\d+$/.test(p1)) {
    showToast('请输入 4 位数字')
    return
  }
  if (p1 !== p2) {
    showToast('两次输入不一致')
    return
  }
  // 使用 PBKDF2 哈希存储
  if (store.lockFileId) {
    const record = await createPasswordRecord(p1, 'pin')
    store.passwords[store.lockFileId] = record
  }
  close()
  if (store.lockCallback) store.lockCallback()
  showToast('密码设置成功')
}

function close() {
  store.lockVisible = false
  store.lockCallback = null
  store.lockFileId = null
  verifying.value = false
}
</script>

<style scoped>
.lock-overlay {
  position: fixed; inset: 0; background: rgba(250,249,247,0.96); backdrop-filter: blur(20px);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  z-index: 2000; opacity: 0; pointer-events: none; transition: opacity 0.3s;
}
.lock-overlay.show { opacity: 1; pointer-events: auto; }
.lock-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 300; color: var(--text-primary); margin-bottom: 6px; }
.lock-subtitle { font-size: 13px; color: var(--text-muted); margin-bottom: 28px; }
.lock-tabs { display: flex; gap: 4px; background: var(--surface-hover); border-radius: var(--radius); padding: 3px; margin-bottom: 28px; }
.lock-tab {
  padding: 7px 18px; border: none; background: transparent; cursor: pointer;
  font-family: inherit; font-size: 13px; color: var(--text-muted); border-radius: 6px; transition: all 0.15s;
}
.lock-tab.active { background: var(--surface); color: var(--text-primary); box-shadow: var(--shadow-sm); }

.pattern-wrap { position: relative; width: 160px; height: 160px; margin-bottom: 20px; }
.pattern-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.pattern-dot {
  width: 18px; height: 18px; border-radius: 50%; background: var(--border);
  cursor: pointer; transition: all 0.15s;
}
.pattern-dot.active { background: var(--accent); transform: scale(1.3); box-shadow: 0 0 0 4px var(--accent-light); }
.pattern-canvas { position: absolute; top: 0; left: 0; pointer-events: none; }
.pattern-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; min-height: 18px; text-align: center; }
.pattern-hint.error { color: var(--danger); }
.pattern-hint.success { color: var(--success); }

.pin-display { display: flex; gap: 14px; margin-bottom: 24px; justify-content: center; }
.pin-dot { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--border); transition: all 0.15s; }
.pin-dot.filled { background: var(--accent); border-color: var(--accent); }
.pin-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 200px; }
.pin-key {
  width: 60px; height: 48px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); background: var(--surface); border-radius: var(--radius);
  cursor: pointer; font-family: 'Cormorant Garamond', serif; font-size: 20px;
  color: var(--text-primary); transition: all 0.1s;
}
.pin-key:hover { background: var(--surface-hover); }
.pin-key:active { transform: scale(0.95); }
.pin-key.empty { border: none; background: transparent; cursor: default; }
.pin-key.backspace { font-size: 14px; color: var(--text-muted); }
.pin-error { color: var(--danger); font-size: 12px; min-height: 18px; margin-top: 8px; text-align: center; }

.setup-input {
  width: 200px; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius);
  font-family: inherit; font-size: 14px; text-align: center; margin-bottom: 10px;
  background: var(--surface); color: var(--text-primary);
}
.setup-input:focus { outline: none; border-color: var(--accent); }
.setup-btn {
  padding: 10px 22px; background: var(--text-primary); color: var(--bg);
  border: none; border-radius: var(--radius); cursor: pointer; font-family: inherit;
  font-size: 13px; transition: all 0.15s; margin-top: 8px;
}
.setup-btn:hover { background: var(--text-secondary); }

.verifying-indicator {
  display: flex; align-items: center; gap: 10px; margin-top: 12px;
  font-size: 12px; color: var(--text-muted);
}
.spinner {
  width: 14px; height: 14px; border: 2px solid var(--border);
  border-top-color: var(--accent); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.cancel-btn {
  padding: 6px 11px; border: none; background: transparent; cursor: pointer;
  font-family: inherit; font-size: 13px; color: var(--text-muted);
  transition: all 0.15s; margin-top: 20px;
}
.cancel-btn:hover { color: var(--text-primary); }
</style>
