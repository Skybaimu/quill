<template>
  <div class="lock-overlay" :class="{ show: store.lockVisible }" @click.self="close">
    <!-- ===== 解锁模式 ===== -->
    <template v-if="store.lockMode === 'unlock' && !showForgot">
      <div class="lock-title" style="margin-top: 10px;">安全验证</div>

      <!-- 解锁方式标签 -->
      <div class="lock-tabs" v-if="hasPattern && hasPin">
        <button class="lock-tab" :class="{ active: unlockTab === 'pattern' }" @click="unlockTab = 'pattern'">图案</button>
        <button class="lock-tab" :class="{ active: unlockTab === 'pin' }" @click="unlockTab = 'pin'">数字</button>
      </div>
      <div class="lock-hint-only" v-else-if="hasPattern && !hasPin">
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        仅设置了图案密码
      </div>
      <div class="lock-hint-only" v-else-if="!hasPattern && hasPin">
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        仅设置了数字密码
      </div>

      <div class="lock-subtitle" v-if="hasPattern || hasPin">请输入密码解锁</div>

      <!-- 图案解锁 -->
      <div v-show="unlockTab === 'pattern' && hasPattern">
        <div class="pattern-wrap" ref="patternWrapEl">
          <div class="pattern-grid">
            <div
              v-for="i in 9" :key="i-1"
              class="pattern-dot"
              :class="{ active: patternDots.includes(i-1) }"
              @mousedown.prevent="startPattern(i-1)"
              @mouseenter="continuePattern(i-1)"
            ></div>
          </div>
          <canvas class="pattern-canvas" ref="patternCanvas" width="240" height="240"></canvas>
        </div>
        <div class="pattern-hint" :class="{ error: patternHintType === 'error', success: patternHintType === 'success' }">{{ patternHint }}</div>
      </div>

      <!-- 数字解锁 -->
      <div v-show="unlockTab === 'pin' && hasPin">
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

      <!-- 忘记密码 -->
      <div class="forgot-area" v-if="hasSecurityQuestions">
        <button class="forgot-btn" @click="showForgot = true">忘记密码？</button>
      </div>

      <!-- 还没设密码的提示 -->
      <div v-if="!hasPattern && !hasPin" class="no-pw-hint">
        <p>此文件尚未设置密码</p>
        <button class="setup-from-unlock" @click="startSetup">立即设置</button>
      </div>
    </template>

    <!-- ===== 忘记密码 → 安全问题 ===== -->
    <template v-if="showForgot">
      <div class="lock-title">安全问题验证</div>
      <div class="lock-subtitle">请回答以下问题以重置密码</div>

      <div class="forgot-questions">
        <div v-for="(sq, idx) in currentSecurityQuestions" :key="idx" class="forgot-q-block">
          <label class="forgot-q-label">{{ sq.question }}</label>
          <input
            class="forgot-q-input"
            v-model="forgotAnswers[idx]"
            placeholder="输入答案"
            @keydown.enter="verifyForgot"
          />
        </div>
      </div>
      <div class="forgot-error" v-if="forgotError">{{ forgotError }}</div>
      <div class="forgot-actions">
        <button class="forgot-verify-btn" @click="verifyForgot" :disabled="forgotVerifying">
          {{ forgotVerifying ? '验证中...' : '验证并重置密码' }}
        </button>
        <button class="forgot-cancel-btn" @click="showForgot = false; forgotError = ''">返回</button>
      </div>
    </template>

    <!-- ===== 设置密码（三步向导） ===== -->
    <template v-if="store.lockMode === 'setup'">
      <!-- 进度指示 -->
      <div class="setup-progress">
        <div class="setup-step" :class="{ active: setupStep === 1, done: setupStep > 1 }">
          <span class="step-num">1</span><span class="step-label">数字密码</span>
        </div>
        <div class="setup-connector" :class="{ done: setupStep > 1 }"></div>
        <div class="setup-step" :class="{ active: setupStep === 2, done: setupStep > 2 }">
          <span class="step-num">2</span><span class="step-label">图案密码</span>
        </div>
        <div class="setup-connector" :class="{ done: setupStep > 2 }"></div>
        <div class="setup-step" :class="{ active: setupStep === 3 }">
          <span class="step-num">3</span><span class="step-label">安全问题</span>
        </div>
      </div>

      <!-- Step 1: 数字密码 -->
      <div v-show="setupStep === 1">
        <div class="lock-title">设置数字密码</div>
        <div class="lock-subtitle">4 位数字，用于快速解锁</div>
        <input type="password" class="setup-input" ref="setupPin1Ref" v-model="setupPin1" placeholder="输入 4 位数字" maxlength="4" inputmode="numeric" /><br/>
        <input type="password" class="setup-input" v-model="setupPin2" placeholder="再次输入确认" maxlength="4" inputmode="numeric" /><br/>
        <div class="setup-step-actions">
          <button class="setup-next-btn" @click="goStep2">下一步</button>
        </div>
      </div>

      <!-- Step 2: 图案密码 -->
      <div v-show="setupStep === 2">
        <div class="lock-title">设置图案密码</div>
        <div class="lock-subtitle">连接至少 4 个点</div>
        <div class="pattern-wrap" ref="setupPatternWrapEl">
          <div class="pattern-grid">
            <div
              v-for="i in 9" :key="i-1"
              class="pattern-dot"
              :class="{ active: setupDots.includes(i-1) }"
              @mousedown.prevent="startSetupPattern(i-1)"
              @mouseenter="continueSetupPattern(i-1)"
            ></div>
          </div>
          <canvas class="pattern-canvas" ref="setupPatternCanvas" width="240" height="240"></canvas>
        </div>
        <div class="pattern-hint" :class="{ error: setupHintType === 'error' }">{{ setupHint }}</div>
        <div v-if="setupConfirmed" class="pattern-hint success" style="display:block">请再次绘制确认</div>
        <div class="setup-step-actions">
          <button class="setup-back-btn" @click="setupStep = 1">上一步</button>
          <button class="setup-skip-btn" @click="skipToStep3" v-if="!patternSetInSetup">跳过图案密码</button>
        </div>
      </div>

      <!-- Step 3: 安全问题 -->
      <div v-show="setupStep === 3">
        <div class="lock-title">安全问题（可选）</div>
        <div class="lock-subtitle">忘记密码时可用于重置</div>

        <div class="sq-setup" v-for="(sq, idx) in setupSecurityQuestions" :key="idx">
          <div class="sq-header">
            <select class="sq-select" v-model="sq.question">
              <option value="" disabled>选择安全问题 {{ idx + 1 }}</option>
              <option v-for="q in availableQuestions(idx)" :key="q" :value="q">{{ q }}</option>
            </select>
            <button v-if="setupSecurityQuestions.length > 1" class="sq-remove" @click="removeSQ(idx)">×</button>
          </div>
          <input
            v-if="sq.question"
            class="sq-answer-input"
            v-model="sq.answer"
            placeholder="输入答案"
          />
        </div>

        <button class="sq-add-btn" @click="addSQ" v-if="setupSecurityQuestions.length < 3">
          + 添加安全问题
        </button>

        <div class="setup-step-actions">
          <button class="setup-back-btn" @click="setupStep = 2">上一步</button>
          <button class="setup-done-btn" @click="finishSetup">完成设置</button>
        </div>
        <button class="setup-skip-btn" style="margin-top:8px" @click="finishSetup">跳过，直接完成</button>
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
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { store, showToast, hasGlobalPassword, getGlobalPasswordRecord, setGlobalPassword } from '../stores/useStore.js'
import {
  createPasswordFileRecord, verifyPattern, verifyPin,
  verifySecurityAnswer, isEncrypted, isNewPasswordFormat,
  migratePassword, SECURITY_QUESTIONS
} from '../utils/crypto.js'

const verifying = ref(false)

// --- 解锁状态 ---
const unlockTab = ref('pattern')
const patternDots = ref([])
const patternDrawing = ref(false)
const patternHint = ref('连接至少 4 个点')
const patternHintType = ref('')
const patternCanvas = ref(null)
const patternWrapEl = ref(null)

const pinValue = ref('')
const pinError = ref('')

// --- 忘记密码 ---
const showForgot = ref(false)
const forgotAnswers = ref({})
const forgotError = ref('')
const forgotVerifying = ref(false)

// --- 设置密码 ---
const setupStep = ref(1)
const setupPin1Ref = ref(null)
const setupPin1 = ref('')
const setupPin2 = ref('')
const setupDots = ref([])
const setupDrawing = ref(false)
const setupConfirmed = ref(false)
const setupFirst = ref(null)
const setupHint = ref('绘制图案，至少 4 个点')
const setupHintType = ref('')
const setupPatternCanvas = ref(null)
const patternSetInSetup = ref(false) // 用户是否完成了图案设置

const setupSecurityQuestions = ref([
  { question: '', answer: '' }
])

// --- 密码记录元信息 ---
const currentRecord = computed(() => {
  // 优先使用文件独立密码，否则使用全局密码
  if (store.lockFileId && store.passwords[store.lockFileId]) {
    return store.passwords[store.lockFileId]
  }
  return getGlobalPasswordRecord()
})

const hasPattern = computed(() => {
  const r = currentRecord.value
  if (!r) return false
  if (isNewPasswordFormat(r)) return !!r.pattern
  if (isEncrypted(r)) return r.type === 'pattern'
  return !!r.pattern
})

const hasPin = computed(() => {
  const r = currentRecord.value
  if (!r) return false
  if (isNewPasswordFormat(r)) return !!r.pin
  if (isEncrypted(r)) return r.type === 'pin'
  return !!r.pin
})

const hasSecurityQuestions = computed(() => {
  const r = currentRecord.value
  return r?.securityQuestions?.length > 0
})

const currentSecurityQuestions = computed(() => {
  const r = currentRecord.value
  return r?.securityQuestions || []
})

// --- 初始化 ---
watch(() => store.lockVisible, async (v) => {
  if (!v) return
  // 重置所有状态
  unlockTab.value = 'pattern'
  resetPattern()
  pinValue.value = ''
  pinError.value = ''
  verifying.value = false
  showForgot.value = false
  forgotAnswers.value = {}
  forgotError.value = ''
  forgotVerifying.value = false
  resetSetup()

  // 迁移旧密码
  await migrateIfNeeded()
})

async function migrateIfNeeded() {
  if (!store.lockFileId) return
  const record = store.passwords[store.lockFileId]
  if (!record) return
  if (isNewPasswordFormat(record)) return
  const migrated = await migratePassword(record)
  if (migrated) store.passwords[store.lockFileId] = migrated
}

// 根据已有密码类型，默认选择可用的解锁方式
watch([hasPattern, hasPin], () => {
  if (hasPattern.value) unlockTab.value = 'pattern'
  else if (hasPin.value) unlockTab.value = 'pin'
}, { immediate: true })

// --- 图案解锁 ---
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
  ctx.clearRect(0, 0, 240, 240)
  if (patternDots.value.length > 0) {
    ctx.strokeStyle = '#c45d3a'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    patternDots.value.forEach((idx, i) => {
      const x = (idx % 3) * 80 + 40
      const y = Math.floor(idx / 3) * 80 + 40
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  }
}

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
  const ok = await verifyPattern(p, currentRecord.value)
  verifying.value = false
  if (ok) {
    patternHint.value = '验证成功'
    patternHintType.value = 'success'
    
    // 不要等 setTimeout，立刻执行回调并关闭！
    if (store.lockCallback) store.lockCallback()
    close()
  } else {
    patternHint.value = '密码错误'
    patternHintType.value = 'error'
    if (patternWrapEl.value) patternWrapEl.value.style.animation = 'shake 0.4s'
    setTimeout(() => { resetPattern(); if (patternWrapEl.value) patternWrapEl.value.style.animation = '' }, 500)
  }
}

function resetPattern() {
  patternDots.value = []
  patternDrawing.value = false
  patternHint.value = '连接至少 4 个点'
  patternHintType.value = ''
  const canvas = patternCanvas.value
  if (canvas) canvas.getContext('2d').clearRect(0, 0, 240, 240)
}

// --- 数字解锁 ---
function pinKey(k) {
  if (verifying.value) return
  if (k === '⌫') {
    pinValue.value = pinValue.value.slice(0, -1)
  } else if (pinValue.value.length < 4) {
    pinValue.value += k
    if (pinValue.value.length === 4) setTimeout(verifyPinUnlock, 150)
  }
}

function handleGlobalKeydown(e) {
  if (store.lockVisible && store.lockMode === 'unlock' && unlockTab.value === 'pin') {
    if (/^[0-9]$/.test(e.key)) pinKey(e.key)
    else if (e.key === 'Backspace') pinKey('⌫')
  }
}
onMounted(() => document.addEventListener('keydown', handleGlobalKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleGlobalKeydown))

async function verifyPinUnlock() {
  if (verifying.value) return
  verifying.value = true
  const ok = await verifyPin(pinValue.value, currentRecord.value)
  verifying.value = false
  if (ok) {
    // 立刻执行回调并关闭！
    if (store.lockCallback) store.lockCallback()
    close()
  } else {
    pinError.value = '密码错误'
    setTimeout(() => { pinValue.value = ''; pinError.value = '' }, 500)
  }
}

// --- 忘记密码 → 安全问题 ---
async function verifyForgot() {
  forgotError.value = ''
  forgotVerifying.value = true
  const questions = currentSecurityQuestions.value
  let allCorrect = true
  for (let i = 0; i < questions.length; i++) {
    const ans = forgotAnswers.value[i] || ''
    if (!ans.trim()) { allCorrect = false; break }
    const ok = await verifySecurityAnswer(i, ans, currentRecord.value)
    if (!ok) { allCorrect = false; break }
  }
  forgotVerifying.value = false
  if (allCorrect) {
    // 重置密码 — 切换到设置模式
    store.lockMode = 'setup'
    showForgot.value = false
    forgotAnswers.value = {}
    showToast('验证成功，请设置新密码')
  } else {
    forgotError.value = '答案错误，请重试'
  }
}

// --- 设置密码（三步向导） ---
function startSetup() {
  store.lockMode = 'setup'
  resetSetup()
}

function resetSetup() {
  setupStep.value = 1
  setupPin1.value = ''
  setupPin2.value = ''
  setupDots.value = []
  setupDrawing.value = false
  setupConfirmed.value = false
  setupFirst.value = null
  setupHint.value = '绘制图案，至少 4 个点'
  setupHintType.value = ''
  patternSetInSetup.value = false
  setupSecurityQuestions.value = [{ question: '', answer: '' }]
  const canvas = setupPatternCanvas.value
  if (canvas) canvas.getContext('2d').clearRect(0, 0, 240, 240)
  
  if (store.lockVisible && store.lockMode === 'setup') {
    import('vue').then(({ nextTick }) => nextTick(() => setupPin1Ref.value?.focus()))
  }
}

function goStep2() {
  const p1 = setupPin1.value
  const p2 = setupPin2.value
  if (p1.length !== 4 || !/^\d+$/.test(p1)) { showToast('请输入 4 位数字'); return }
  if (p1 !== p2) { showToast('两次输入不一致'); return }
  setupStep.value = 2
}

function skipToStep3() {
  patternSetInSetup.value = false
  setupStep.value = 3
}

// 图案设置
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
  ctx.clearRect(0, 0, 240, 240)
  if (setupDots.value.length > 0) {
    ctx.strokeStyle = '#c45d3a'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    setupDots.value.forEach((idx, i) => {
      const x = (idx % 3) * 80 + 40
      const y = Math.floor(idx / 3) * 80 + 40
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

function endSetupPattern() {
  const p = setupDots.value.join('')
  if (p.length < 4) {
    setupHint.value = '至少 4 个点'
    setupHintType.value = 'error'
    setTimeout(() => { setupDots.value = []; drawSetupPattern(); setupHint.value = '绘制图案，至少 4 个点'; setupHintType.value = '' }, 600)
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
    patternSetInSetup.value = true
    setupStep.value = 3
  } else {
    setupHint.value = '两次不一致'
    setupHintType.value = 'error'
    setTimeout(() => {
      setupDots.value = []
      setupConfirmed.value = false
      setupFirst.value = null
      drawSetupPattern()
      setupHint.value = '绘制图案，至少 4 个点'
      setupHintType.value = ''
    }, 800)
  }
}

// 安全问题
function availableQuestions(currentIdx) {
  const used = setupSecurityQuestions.value
    .filter((sq, i) => i !== currentIdx && sq.question)
    .map(sq => sq.question)
  return SECURITY_QUESTIONS.filter(q => !used.includes(q))
}

function addSQ() {
  if (setupSecurityQuestions.value.length < 3) {
    setupSecurityQuestions.value.push({ question: '', answer: '' })
  }
}

function removeSQ(idx) {
  setupSecurityQuestions.value.splice(idx, 1)
}

// 完成设置
async function finishSetup() {
  const patternText = patternSetInSetup.value ? setupFirst.value : null
  const pinText = setupPin1.value || null
  const questions = setupSecurityQuestions.value
    .filter(sq => sq.question && sq.answer.trim())
    .map(sq => ({ question: sq.question, answer: sq.answer.trim() }))

  if (!patternText && !pinText) {
    showToast('至少设置一种密码')
    return
  }

  verifying.value = true
  const record = await createPasswordFileRecord(patternText, pinText, questions)
  // 存为全局密码
  setGlobalPassword(record)
  verifying.value = false
  close()
  if (store.lockCallback) store.lockCallback()
  const methods = []
  if (pinText) methods.push('数字')
  if (patternText) methods.push('图案')
  showToast('全局密码设置成功 (' + methods.join('+') + ')')
}

function close() { 
  store.lockVisible = false 
  store.lockCallback = null
  store.lockFileId = null
  verifying.value = false
  showForgot.value = false
}
</script>

<style scoped>
.lock-overlay {
  position: fixed; inset: 0; background: var(--bg);
  z-index: 9999; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
  backdrop-filter: blur(10px);
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

.lock-hint-only {
  display: flex; align-items: center; gap: 6px; font-size: 12px;
  color: var(--text-muted); margin-bottom: 16px; padding: 5px 12px;
  background: var(--surface-hover); border-radius: 20px;
}

/* Pattern */
.pattern-wrap { position: relative; width: 240px; height: 240px; margin-bottom: 20px; }
.pattern-grid { display: grid; grid-template-columns: repeat(3, 1fr); height: 100%; align-content: space-evenly; justify-items: center; }
.pattern-dot {
  width: 60px; height: 60px; padding: 20px; background-clip: content-box;
  border-radius: 50%; background-color: var(--border);
  cursor: pointer; transition: all 0.15s;
}
.pattern-dot.active { background-color: var(--accent); transform: scale(1.3); }
.pattern-canvas { position: absolute; top: 0; left: 0; pointer-events: none; }
.pattern-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; min-height: 18px; text-align: center; }
.pattern-hint.error { color: var(--danger); }
.pattern-hint.success { color: var(--success); }

/* PIN */
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

/* Setup wizard */
.setup-progress {
  display: flex; align-items: center; gap: 0; margin-bottom: 32px; padding: 0 8px;
}
.setup-step {
  display: flex; align-items: center; gap: 8px; opacity: 0.4; transition: all 0.3s;
}
.setup-step.active { opacity: 1; }
.setup-step.done { opacity: 0.7; }
.step-num {
  width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: var(--text-muted); transition: all 0.3s;
}
.setup-step.active .step-num { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.setup-step.done .step-num { border-color: var(--success); color: var(--success); background: rgba(74,140,111,0.1); }
.step-label { font-size: 12px; color: var(--text-muted); white-space: nowrap; }
.setup-step.active .step-label { color: var(--text-primary); }
.setup-connector {
  width: 40px; height: 2px; background: var(--border); margin: 0 8px;
  transition: background 0.3s;
}
.setup-connector.done { background: var(--success); }

.setup-input {
  width: 200px; padding: 10px 14px; border: 1px solid var(--border); border-radius: var(--radius);
  font-family: inherit; font-size: 14px; text-align: center; margin-bottom: 10px;
  background: var(--surface); color: var(--text-primary);
}
.setup-input:focus { outline: none; border-color: var(--accent); }

.setup-step-actions {
  display: flex; gap: 10px; justify-content: center; margin-top: 16px;
}
.setup-next-btn, .setup-done-btn {
  padding: 10px 28px; background: var(--text-primary); color: var(--bg);
  border: none; border-radius: var(--radius); cursor: pointer; font-family: inherit;
  font-size: 13px; transition: all 0.15s;
}
.setup-next-btn:hover, .setup-done-btn:hover { background: var(--text-secondary); }
.setup-back-btn {
  padding: 10px 20px; background: transparent; border: 1px solid var(--border);
  border-radius: var(--radius); cursor: pointer; font-family: inherit;
  font-size: 13px; color: var(--text-muted); transition: all 0.15s;
}
.setup-back-btn:hover { border-color: var(--text-muted); color: var(--text-primary); }
.setup-skip-btn {
  padding: 6px 14px; border: none; background: transparent; cursor: pointer;
  font-family: inherit; font-size: 12px; color: var(--text-muted); transition: all 0.15s;
}
.setup-skip-btn:hover { color: var(--accent); }

/* Security questions setup */
.sq-setup {
  background: var(--surface-hover); border-radius: var(--radius); padding: 14px;
  margin-bottom: 12px; width: 320px;
}
.sq-header { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.sq-select {
  flex: 1; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px;
  font-family: inherit; font-size: 13px; background: var(--surface); color: var(--text-primary);
  cursor: pointer;
}
.sq-select:focus { outline: none; border-color: var(--accent); }
.sq-remove {
  width: 24px; height: 24px; border: none; background: transparent; cursor: pointer;
  color: var(--text-muted); font-size: 16px; border-radius: 4px;
}
.sq-remove:hover { background: var(--danger-light); color: var(--danger); }
.sq-answer-input {
  width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px;
  font-family: inherit; font-size: 13px; background: var(--surface); color: var(--text-primary);
}
.sq-answer-input:focus { outline: none; border-color: var(--accent); }

.sq-add-btn {
  display: block; width: 320px; padding: 10px; border: 1px dashed var(--border);
  border-radius: var(--radius); background: transparent; cursor: pointer;
  font-family: inherit; font-size: 12px; color: var(--text-muted); margin-bottom: 16px;
  transition: all 0.15s;
}
.sq-add-btn:hover { border-color: var(--accent); color: var(--accent); }

/* Forgot password */
.forgot-questions { width: 320px; margin-bottom: 16px; }
.forgot-q-block { margin-bottom: 14px; }
.forgot-q-label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.forgot-q-input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius);
  font-family: inherit; font-size: 14px; background: var(--surface); color: var(--text-primary);
}
.forgot-q-input:focus { outline: none; border-color: var(--accent); }
.forgot-error { color: var(--danger); font-size: 12px; margin-bottom: 12px; text-align: center; }
.forgot-actions { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.forgot-verify-btn {
  padding: 10px 28px; background: var(--text-primary); color: var(--bg);
  border: none; border-radius: var(--radius); cursor: pointer; font-family: inherit;
  font-size: 13px; transition: all 0.15s;
}
.forgot-verify-btn:hover { background: var(--text-secondary); }
.forgot-verify-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.forgot-cancel-btn {
  padding: 6px 14px; border: none; background: transparent; cursor: pointer;
  font-family: inherit; font-size: 12px; color: var(--text-muted);
}

/* No password hint */
.no-pw-hint { text-align: center; padding: 20px 0; }
.no-pw-hint p { font-size: 14px; color: var(--text-muted); margin-bottom: 16px; }
.setup-from-unlock {
  padding: 10px 24px; background: var(--text-primary); color: var(--bg);
  border: none; border-radius: var(--radius); cursor: pointer; font-family: inherit;
  font-size: 13px; transition: all 0.15s;
}
.setup-from-unlock:hover { background: var(--text-secondary); }

/* Forgot link */
.forgot-area { margin-top: 16px; }
.forgot-btn {
  padding: 6px 14px; border: none; background: transparent; cursor: pointer;
  font-family: inherit; font-size: 12px; color: var(--text-muted); transition: color 0.15s;
}
.forgot-btn:hover { color: var(--accent); }

/* Verifying */
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
