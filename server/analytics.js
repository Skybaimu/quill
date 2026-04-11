/**
 * Quill 统计接收端 (Node.js)
 * 
 * 使用方法：
 *   npm install express
 *   node analytics.js
 * 
 * 或者集成到你现有的 Node.js 项目中
 * 
 * 请求格式：
 *   GET /api/quill-ping?id=uuid&v=0.1.0&p=win&t=timestamp
 */

const express = require('express')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = 3456
const DATA_FILE = path.join(__dirname, 'quill-stats.json')

// 加载已有数据
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return { totalPings: 0, uniqueUsers: [], dailyStats: {} }
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// 接收统计
app.get('/api/quill-ping', (req, res) => {
  const { id, v, p, t } = req.query
  if (!id) return res.status(400).send('missing id')

  const data = loadData()
  const today = new Date().toISOString().slice(0, 10)

  // 总计
  data.totalPings++

  // 去重用户
  if (!data.uniqueUsers.find(u => u.id === id)) {
    data.uniqueUsers.push({
      id,
      firstSeen: new Date().toISOString(),
      platform: p || 'unknown',
      version: v || 'unknown'
    })
  }

  // 每日统计
  if (!data.dailyStats[today]) {
    data.dailyStats[today] = { pings: 0, users: [] }
  }
  data.dailyStats[today].pings++
  if (!data.dailyStats[today].users.includes(id)) {
    data.dailyStats[today].users.push(id)
  }

  saveData(data)

  // 返回 1x1 透明像素（兼容 sendBeacon）
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  res.set('Content-Type', 'image/gif')
  res.set('Cache-Control', 'no-store')
  res.send(pixel)
})

// 查看统计面板
app.get('/api/quill-stats', (req, res) => {
  const data = loadData()
  const today = new Date().toISOString().slice(0, 10)
  
  res.json({
    总请求数: data.totalPings,
    去重用户数: data.uniqueUsers.length,
    今日请求数: data.dailyStats[today]?.pings || 0,
    今日活跃用户: data.dailyStats[today]?.users?.length || 0,
    平台分布: data.uniqueUsers.reduce((acc, u) => {
      acc[u.platform] = (acc[u.platform] || 0) + 1
      return acc
    }, {}),
    版本分布: data.uniqueUsers.reduce((acc, u) => {
      acc[u.version] = (acc[u.version] || 0) + 1
      return acc
    }, {}),
    最近7天: Object.keys(data.dailyStats).slice(-7).map(d => ({
      日期: d,
      请求: data.dailyStats[d].pings,
      用户: data.dailyStats[d].users.length
    }))
  })
})

app.listen(PORT, () => {
  console.log(`Quill 统计服务运行在 http://localhost:${PORT}`)
  console.log(`  统计接收: GET /api/quill-ping`)
  console.log(`  查看数据: GET /api/quill-stats`)
})
