import { createApp } from 'vue'
import './styles/main.css'
import App from './App.vue'
import { trackStartup } from './utils/analytics.js'

createApp(App).mount('#app')

// 应用启动时发送匿名统计
trackStartup()

// 禁用浏览器/Tauri原生的文件拖放默认行为，以支持Vue内部的拖放排序
document.addEventListener('dragover', (e) => {
  e.preventDefault()
  if (e.dataTransfer.types.includes('Files')) {
    e.dataTransfer.dropEffect = 'copy'
  } else if (!e.dataTransfer.types.includes('text/plain')) {
    e.dataTransfer.dropEffect = 'none'
  }
}, false)
document.addEventListener('drop', (e) => {
  e.preventDefault()
}, false)
