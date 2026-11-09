<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView, RouterLink } from 'vue-router'
import BootstrapScreen from '@/components/BootstrapScreen.vue'
import { useBootstrapStore } from '@/bootstrap/bootstrapStore'

const bootstrap = useBootstrapStore()
const { status, message, error, steps, isReady } = storeToRefs(bootstrap)

onMounted(() => {
  void bootstrap.start()
})

const navItems = [
  { to: '/', label: '便利贴', icon: '▦' },
  { to: '/history', label: '已完成', icon: '✓' },
  { to: '/settings', label: '设置', icon: '⚙' },
]
</script>

<template>
  <BootstrapScreen
    v-if="!isReady"
    :status="status"
    :message="message"
    :error="error"
    :steps="steps"
    @retry="bootstrap.retry"
  />
  <div v-else class="app-shell">
    <header class="top-bar">
      <span class="title">便利贴</span>
      <nav class="actions">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :aria-label="item.label"
        >
          <span class="nav-icon">{{ item.icon }}</span>
        </RouterLink>
      </nav>
    </header>
    <main class="page">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: background 0.15s ease;
}

.nav-link:hover {
  background: rgba(60, 50, 30, 0.08);
}

.nav-link.router-link-active {
  background: var(--accent);
  color: #4a3a15;
}

.nav-icon {
  font-size: 17px;
  line-height: 1;
}
</style>
