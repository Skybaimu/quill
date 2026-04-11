import { createApp } from 'vue'
import './styles/main.css'
import App from './App.vue'
import { trackStartup } from './utils/analytics.js'

createApp(App).mount('#app')

// 应用启动时发送匿名统计
trackStartup()
