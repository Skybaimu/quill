<template>
  <div class="toast" :class="{ show: store.toastVisible }">{{ store.toastMessage }}</div>
</template>

<script setup>
import { store } from '../stores/useStore.js'
</script>

<style scoped>
.toast {
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%) translateY(80px);
  background: var(--text-primary); color: var(--bg); padding: 10px 22px;
  border-radius: var(--radius); font-size: 13px; opacity: 0; transition: all 0.3s;
  z-index: 3000; white-space: nowrap; pointer-events: none;
}
.toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
</style>
