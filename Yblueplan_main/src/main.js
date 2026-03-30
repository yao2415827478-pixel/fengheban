import { createApp } from 'vue'
import App from './App.vue'
import router from './router.js'
import './style.css'
import './services/payment.js'

// 开发调试工具（仅开发环境生效）
import './utils/debug.js'

const app = createApp(App)
app.use(router)
app.mount('#app')