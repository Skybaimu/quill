<template>
  <div class="app-root">
    <div class="app" :class="appClasses">
      <Sidebar />
      <FilePanel ref="filePanelRef" />
      <ContentPanel />
    </div>
    <ContextMenu />
    <BlockMenu />
    <LockOverlay />
    <Toast />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import FilePanel from './components/FilePanel.vue'
import ContentPanel from './components/ContentPanel.vue'
import ContextMenu from './components/ContextMenu.vue'
import BlockMenu from './components/BlockMenu.vue'
import LockOverlay from './components/LockOverlay.vue'
import Toast from './components/Toast.vue'
import { store } from './stores/useStore.js'

const filePanelRef = ref(null)

const appClasses = computed(() => ({
  'sidebar-collapsed': store.sidebarCollapsed,
  'filepanel-collapsed': store.filePanelCollapsed
}))
</script>

<style>
.app-root { height: 100vh; width: 100vw; overflow: hidden; }
.app {
  display: grid;
  grid-template-columns: 220px 260px 1fr;
  height: 100vh;
  width: 100vw;
  transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.app.sidebar-collapsed { grid-template-columns: 52px 260px 1fr; }
.app.filepanel-collapsed { grid-template-columns: 220px 0px 1fr; }
.app.sidebar-collapsed.filepanel-collapsed { grid-template-columns: 52px 0px 1fr; }
</style>
