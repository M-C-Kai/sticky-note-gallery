<script setup lang="ts">
import SettingsPanel from '@/components/SettingsPanel.vue'
import RuntimeStatusPanel from '@/components/RuntimeStatusPanel.vue'
import { BUILD_INFO } from '@/generated/buildInfo'

const BUILD_ID = BUILD_INFO.buildId
const BUILD_TIME = BUILD_INFO.buildTime
</script>

<template>
  <div class="settings-page">
    <div class="settings-diagnostic">
      <h2>运行状态</h2>
      <div>SETTINGS NEW BUILD</div>
      <div>Version: 0.1.0</div>
      <div>Build ID: {{ BUILD_ID }}</div>
      <div>Build Time: {{ BUILD_TIME }}</div>
      <div>Storage Check UI Loaded</div>
    </div>
    <RuntimeStatusPanel />
    <SettingsPanel />
  </div>
</template>

<style scoped>
.settings-page {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.settings-diagnostic {
  display: block;
  visibility: visible;
  opacity: 1;
  height: auto;
  min-height: 160px;
  position: relative;
  z-index: 999;
  max-width: 480px;
  margin: 16px auto;
  padding: 16px;
  border: 3px solid #b00020;
  background: #fff2a8;
  color: #8b0018;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.6;
}

.settings-diagnostic h2 {
  margin: 0 0 8px;
  color: #b00020;
  font-size: 20px;
}
</style>
