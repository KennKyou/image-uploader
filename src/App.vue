<script setup>
import Header from './components/Header.vue'
import GithubImageUploader from './components/GithubImageUploader.vue'
</script>

<template>
  <div class="app">
    <Header />
    <GithubImageUploader />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex-grow: 1;
  padding: 1rem;
}
</style>