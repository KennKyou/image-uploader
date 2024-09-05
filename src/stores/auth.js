import { ref } from 'vue'
import { defineStore } from 'pinia'
import CryptoJS from 'crypto-js'

export const useAuthStore = defineStore('auth', () => {
  const encryptToken = (token) => {
    const secretKey = 'github-token-key' // 使用固定的密鑰
    return CryptoJS.AES.encrypt(token, secretKey).toString()
  }

  const decryptToken = (encryptedToken) => {
    const secretKey = 'github-token-key'
    const bytes = CryptoJS.AES.decrypt(encryptedToken, secretKey)
    return bytes.toString(CryptoJS.enc.Utf8)
  }

  const saveGithubToken = (token) => {
    const encryptedToken = encryptToken(token)
    localStorage.setItem('gt', encryptedToken)
  }

  const getGithubToken = () => {
    const encryptedToken = localStorage.getItem('gt')
    if (encryptedToken) {
      return decryptToken(encryptedToken)
    }
    return null
  }

  const removeGithubToken = () => {
    localStorage.removeItem('gt')
  }

  return {
    saveGithubToken,
    getGithubToken,
    removeGithubToken
  }
})
