import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useBreakpoint(query = '(min-width: 768px)') {
  const mq = window.matchMedia(query)
  const matches = ref(mq.matches)
  const onChange = (e) => { matches.value = e.matches }

  onMounted(() => mq.addEventListener('change', onChange))
  onBeforeUnmount(() => mq.removeEventListener('change', onChange))

  return matches
}
