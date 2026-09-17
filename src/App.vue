<script setup lang="ts"></script>

<template>
  <div class="akpedia-page">
    <AkSidebar />
    <div class="main-section">
      <AkHeader />
      <RouterView />
    </div>
  </div>
</template>

<style lang="css" scoped>
.akpedia-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
}
.main-section {
  flex: 1;
}
</style>
