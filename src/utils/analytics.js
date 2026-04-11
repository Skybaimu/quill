/**
 * Quill 匿名启动统计
 * 仅在打包版本中生效，开发模式不发送
 * 数据：匿名UUID + 版本号 + 平台
 */

const ANALYTICS_URL = 'https://promgpt.top/api/quill-ping'
const UUID_KEY = 'quill-analytics-uuid'
const APP_VERSION = '0.1.0'

function getOrCreateUUID() {
  let uuid = localStorage.getItem(UUID_KEY)
  if (!uuid) {
    uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
    localStorage.setItem(UUID_KEY, uuid)
  }
  return uuid
}

function getPlatform() {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'win'
  if (ua.includes('Mac')) return 'mac'
  if (ua.includes('Linux')) return 'linux'
  return 'unknown'
}

export function trackStartup() {
  // 开发模式不统计
  if (import.meta.env.DEV) return

  const uuid = getOrCreateUUID()
  const platform = getPlatform()
  const params = new URLSearchParams({
    id: uuid,
    v: APP_VERSION,
    p: platform,
    t: Date.now().toString()
  })

  // 用 sendBeacon（不阻塞页面加载），失败了也没关系
  const url = `${ANALYTICS_URL}?${params.toString()}`
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url)
  } else {
    fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(() => {})
  }
}
