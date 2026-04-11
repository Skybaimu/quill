/**
 * crypto.js — 密码加密工具
 * 使用 Web Crypto API 进行安全的密码哈希
 *
 * 算法：PBKDF2 + SHA-256
 * - 每个密码使用独立的随机 salt（16 字节）
 * - 迭代 100,000 次（防止暴力破解）
 * - 输出 256-bit 密钥作为哈希值
 */

const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 16 // bytes
const KEY_LENGTH = 32 // bytes (256 bits)

/**
 * 生成随机 salt（hex 字符串）
 */
export function generateSalt() {
  const arr = new Uint8Array(SALT_LENGTH)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 将 hex 字符串转为 Uint8Array
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

/**
 * 将 ArrayBuffer 转为 hex 字符串
 */
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 使用 PBKDF2 哈希密码
 * @param {string} password - 明文密码（图案密码为 "012456" 格式，PIN 为 "1234" 格式）
 * @param {string} saltHex - 十六进制 salt
 * @returns {Promise<string>} - 十六进制哈希值
 */
export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const salt = hexToBytes(saltHex)
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8 // bits
  )
  return bufferToHex(derivedBits)
}

/**
 * 设置新密码：生成 salt，哈希，返回存储对象
 * @param {string} password
 * @param {'pattern'|'pin'} type
 * @returns {Promise<object>} - { type, salt, hash }
 */
export async function createPasswordRecord(password, type) {
  const salt = generateSalt()
  const hash = await hashPassword(password, salt)
  return { type, salt, hash }
}

/**
 * 验证密码是否正确
 * @param {string} password - 用户输入的密码
 * @param {object} record - 存储的密码记录 { type, salt, hash }
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, record) {
  if (!record || !record.salt || !record.hash) return false
  const hash = await hashPassword(password, record.salt)
  return hash === record.hash
}

/**
 * 判断密码记录是否已加密（新格式）
 * 老格式：{ pattern: "012456" } 或 { pin: "1234" }
 * 新格式：{ type: "pattern", salt: "...", hash: "..." }
 */
export function isEncryptedRecord(record) {
  return record && typeof record.salt === 'string' && typeof record.hash === 'string'
}

/**
 * 迁移旧格式密码到新格式（一次性升级）
 * @param {object} oldRecord - { pattern: "..." } 或 { pin: "..." }
 * @returns {Promise<object>} - 新格式 { type, salt, hash }
 */
export async function migratePassword(oldRecord) {
  if (oldRecord.pattern !== undefined) {
    return createPasswordRecord(oldRecord.pattern, 'pattern')
  }
  if (oldRecord.pin !== undefined) {
    return createPasswordRecord(oldRecord.pin, 'pin')
  }
  return null
}
