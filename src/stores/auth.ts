import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import subsonicApi, { type SubsonicConfig } from '../api/subsonic'

const STORAGE_KEY = 'rhythm-desk-auth'

export const useAuthStore = defineStore('auth', () => {
  const server = ref('')
  const username = ref('')
  const password = ref('')
  const isAuthenticated = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const config = computed<SubsonicConfig | null>(() => {
    if (!server.value || !username.value || !password.value) {
      return null
    }
    return {
      server: server.value,
      username: username.value,
      password: password.value
    }
  })

  // 从本地存储加载配置
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        server.value = data.server || ''
        username.value = data.username || ''
        password.value = data.password || ''

        if (config.value) {
          subsonicApi.configure(config.value)
          isAuthenticated.value = true
        }
      }
    } catch (e) {
      console.error('Failed to load auth from storage:', e)
    }
  }

  // 保存到本地存储
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        server: server.value,
        username: username.value,
        password: password.value
      }))
    } catch (e) {
      console.error('Failed to save auth to storage:', e)
    }
  }

  // 登录
  async function login(serverUrl: string, user: string, pass: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      // 规范化服务器 URL
      let normalizedUrl = serverUrl.trim()
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'http://' + normalizedUrl
      }
      if (normalizedUrl.endsWith('/')) {
        normalizedUrl = normalizedUrl.slice(0, -1)
      }

      const testConfig: SubsonicConfig = {
        server: normalizedUrl,
        username: user,
        password: pass
      }

      subsonicApi.configure(testConfig)
      const success = await subsonicApi.ping()

      if (success) {
        server.value = normalizedUrl
        username.value = user
        password.value = pass
        isAuthenticated.value = true
        saveToStorage()
        return true
      } else {
        error.value = '连接失败，请检查服务器地址和凭据'
        return false
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '连接失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  function logout() {
    server.value = ''
    username.value = ''
    password.value = ''
    isAuthenticated.value = false
    localStorage.removeItem(STORAGE_KEY)
  }

  // 初始化时加载
  loadFromStorage()

  return {
    server,
    username,
    password,
    isAuthenticated,
    isLoading,
    error,
    config,
    login,
    logout,
    loadFromStorage
  }
})
