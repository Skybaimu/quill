/**
 * Quill 调试日志系统
 * 环形缓冲区存储最近 200 条日志，支持复制/下载
 */

const MAX_ENTRIES = 200
const entries = []

function log(level, tag, message, data) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    tag,
    message,
    data: data !== undefined ? data : null
  }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.shift()

  // 同时输出到控制台
  const prefix = `[${entry.ts.slice(11, 23)}][${tag}]`
  if (level === 'error') {
    console.error(prefix, message, data ?? '')
  } else if (level === 'warn') {
    console.warn(prefix, message, data ?? '')
  } else {
    console.log(prefix, message, data ?? '')
  }
}

export const logger = {
  info: (tag, msg, data) => log('info', tag, msg, data),
  warn: (tag, msg, data) => log('warn', tag, msg, data),
  error: (tag, msg, data) => log('error', tag, msg, data),
  debug: (tag, msg, data) => log('debug', tag, msg, data),

  getEntries: () => [...entries],

  getEntryCount: () => entries.length,

  clear: () => { entries.length = 0 },

  formatEntries: () => {
    return entries.map(e => {
      const dataStr = e.data ? ' | ' + (typeof e.data === 'string' ? e.data : JSON.stringify(e.data)) : ''
      return `${e.ts} [${e.level.toUpperCase()}] [${e.tag}] ${e.message}${dataStr}`
    }).join('\n')
  },

  copyToClipboard: async () => {
    const text = logger.formatEntries()
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    }
  },

  download: () => {
    const text = logger.formatEntries()
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `quill-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }
}
