<script setup lang="ts"></script>

<template>
  <div class="akpedia-page">
    <AkSidebar />
    <div class="main-section">
      <AkHeader />
      <div class="main-content">
        <RouterView />
      </div>
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
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.main-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
