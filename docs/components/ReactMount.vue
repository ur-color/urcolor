<script setup>
import { ref, onMounted, onUnmounted, h } from 'vue'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'

const props = defineProps({
  component: Function,
})

const el = ref(null)
let root

onMounted(() => {
  if (el.value && props.component) {
    root = createRoot(el.value)
    root.render(createElement(props.component))
  }
})

onUnmounted(() => {
  root?.unmount()
})
</script>

<template>
  <div ref="el" />
</template>
