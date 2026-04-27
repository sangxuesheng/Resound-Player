<template>
  <div class="startup-error">
    <div class="error-container">
      <div class="error-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h1 class="error-title">应用启动失败</h1>
      <p class="error-message">{{ errorMessage }}</p>
      
      <div class="error-details" v-if="showDetails">
        <h3>可能的原因：</h3>
        <ul>
          <li>API服务依赖缺失或损坏</li>
          <li>网络端口被其他程序占用</li>
          <li>Windows防火墙阻止了网络访问</li>
          <li>系统权限不足</li>
        </ul>
        
        <h3>解决方案：</h3>
        <ol>
          <li>重新安装应用</li>
          <li>检查端口占用情况</li>
          <li>暂时关闭防火墙测试</li>
          <li>以管理员权限运行应用</li>
        </ol>
      </div>
      
      <div class="error-actions">
        <button @click="toggleDetails" class="btn btn-secondary">
          {{ showDetails ? '隐藏详情' : '显示详情' }}
        </button>
        <button @click="retryStartup" class="btn btn-primary">
          重新启动
        </button>
        <button @click="exitApp" class="btn btn-danger">
          退出应用
        </button>
      </div>
      
      <div class="error-footer">
        <p>如果问题持续存在，请联系技术支持</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const errorMessage = ref('内嵌API服务启动失败，应用无法正常运行。')
const showDetails = ref(false)

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

const retryStartup = () => {
  window.location.reload()
}

const exitApp = () => {
  if (window.electronAPI) {
    window.electronAPI.quitApp()
  } else {
    window.close()
  }
}
</script>

<style scoped>
.startup-error {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.error-container {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  text-align: center;
}

.error-icon {
  color: #e74c3c;
  margin-bottom: 1rem;
}

.error-title {
  color: #2c3e50;
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.error-message {
  color: #7f8c8d;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.error-details {
  text-align: left;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.error-details h3 {
  color: #2c3e50;
  margin: 0.5rem 0;
  font-size: 1rem;
}

.error-details ul, .error-details ol {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.error-details li {
  margin: 0.25rem 0;
  color: #7f8c8d;
}

.error-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.error-footer {
  border-top: 1px solid #ecf0f1;
  padding-top: 1rem;
  color: #bdc3c7;
  font-size: 0.8rem;
}
</style>