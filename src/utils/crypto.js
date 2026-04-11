/**
 * crypto.js — 密码加密工具
 * 使用 Web Crypto API 进行安全的密码哈希
 *
 * 算法：PBKDF2 + SHA-256
 * - 每个密码/安全答案使用独立的随机 salt（16 字节）
 * - 迭代 100,000 次（防止暴力破解）
 * - 输出 256-bit 密钥作为哈希值
 */

const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 16 // bytes
const KEY_LENGTH = 32 // bytes (256 bits)

/** 生成随机 salt（hex 字符串） */
export function generateSalt() {
  const arr = new Uint8Array(SALT_LENGTH)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

/** hex → Uint8Array */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

/** ArrayBuffer → hex */
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 使用 PBKDF2 哈希密码
 * @param {string} password
 * @param {string} saltHex - 十六进制 salt
 * @returns {Promise<string>} - 十六进制哈希值
 */
export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const salt = hexToBytes(saltHex)
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, KEY_LENGTH * 8
  )
  return bufferToHex(derivedBits)
}

/**
 * 创建单个凭证记录（{ salt, hash }）
 * @param {string} secret
 * @returns {Promise<{salt: string, hash: string}>}
 */
export async function createCredential(secret) {
  const salt = generateSalt()
  const hash = await hashPassword(secret, salt)
  return { salt, hash }
}

/**
 * 验证凭证
 * @param {string} input - 用户输入
 * @param {{salt: string, hash: string}} record - 存储的凭证
 * @returns {Promise<boolean>}
 */
export async function verifyCredential(input, record) {
  if (!record || !record.salt || !record.hash) return false
  const hash = await hashPassword(input, record.salt)
  return hash === record.hash
}

/**
 * 判断是否为加密凭证格式（新格式）
 */
export function isEncrypted(record) {
  return record && typeof record.salt === 'string' && typeof record.hash === 'string'
}

/**
 * 判断密码记录是否为新版格式（包含 pattern/pin 子对象）
 */
export function isNewPasswordFormat(record) {
  return record && (record.pattern || record.pin)
}

/**
 * 设置密码文件的完整记录
 * @param {string|null} patternText - 图案密码字符串，如 "012456"
 * @param {string|null} pinText - 数字密码字符串，如 "1234"
 * @param {Array<{question: string, answer: string}>} questions - 安全问题
 * @returns {Promise<object>}
 */
export async function createPasswordFileRecord(patternText, pinText, questions = []) {
  const record = {}
  if (patternText) {
    record.pattern = await createCredential(patternText)
  }
  if (pinText) {
    record.pin = await createCredential(pinText)
  }
  if (questions.length > 0) {
    record.securityQuestions = []
    for (const q of questions) {
      const cred = await createCredential(q.answer.toLowerCase().trim())
      record.securityQuestions.push({
        question: q.question,
        answerHash: cred.hash,
        answerSalt: cred.salt
      })
    }
  }
  return record
}

/**
 * 验证图案密码
 */
export async function verifyPattern(input, record) {
  if (!record?.pattern) return false
  return verifyCredential(input, record.pattern)
}

/**
 * 验证数字密码
 */
export async function verifyPin(input, record) {
  if (!record?.pin) return false
  return verifyCredential(input, record.pin)
}

/**
 * 验证安全问题答案
 * @param {number} index - 问题索引
 * @param {string} answer - 用户答案
 * @param {object} record
 * @returns {Promise<boolean>}
 */
export async function verifySecurityAnswer(index, answer, record) {
  if (!record?.securityQuestions?.[index]) return false
  const sq = record.securityQuestions[index]
  return verifyCredential(answer.toLowerCase().trim(), { salt: sq.answerSalt, hash: sq.answerHash })
}

/**
 * 迁移旧格式密码
 * 旧格式 A：{ pattern: "012456" } 或 { pin: "1234" }（明文）
 * 旧格式 B：{ type, salt, hash }（单凭证加密）
 * 新格式：{ pattern: {salt,hash}, pin: {salt,hash}, securityQuestions: [...] }
 */
export async function migratePassword(record) {
  if (!record) return null

  // 已经是新格式
  if (isNewPasswordFormat(record)) return record

  // 旧格式 B：单凭证加密 { type: "pattern", salt, hash }
  if (isEncrypted(record)) {
    const out = {}
    out[record.type] = { salt: record.salt, hash: record.hash }
    return out
  }

  // 旧格式 A：明文
  const out = {}
  if (record.pattern !== undefined) {
    out.pattern = await createCredential(record.pattern)
  }
  if (record.pin !== undefined) {
    out.pin = await createCredential(record.pin)
  }
  return out
}

// 预设安全问题列表
export const SECURITY_QUESTIONS = [
  '你的第一只宠物叫什么名字？',
  '你小学班主任姓什么？',
  '你最喜欢的城市是哪里？',
  '你的出生地是哪里？',
  '你第一份工作的公司名？',
  '你最喜欢的电影是什么？',
  '你中学最好的朋友叫什么？',
  '你童年最喜欢的玩具是什么？'
]
