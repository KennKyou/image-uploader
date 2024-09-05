<script setup>
import { ref } from 'vue'
const logoUrl = ref(new URL('@/assets/images/doge.png', import.meta.url).href)
const githubLogoUrl = ref(new URL('@/assets/images/github.png', import.meta.url).href)
const webTitle = ref('GitHub 圖床')
const githubUrl = ref('https://github.com/KennKyou/image-uploader')
const githubTitle = ref('GitHub（另開新視窗）')
</script>

<template>
  <header class="header">
    <div class="logo">
      <img :src="logoUrl" alt="網站 Logo">
      <h1 class="title">{{ webTitle }}</h1>
    </div>
    <div class="nav">
      <a :href="githubUrl" class="nav-link" target="_blank" rel="noopener noreferrer" :title="githubTitle">
        <img :src="githubLogoUrl" alt="網站 Logo">
      </a>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
}

.logo {
  display: flex;
  align-items: center;
}

.logo img, .nav-link img {
  height: 40px;
}

.title {
  font-size: 1.2rem;
  margin: 0;
  margin-left: 10px;
}

.nav-link {
  text-decoration: none;
  display: flex;
}

@media (max-width: 768px) {
  .logo img, .nav-link img {
    height: 30px;
  }
}
</style>