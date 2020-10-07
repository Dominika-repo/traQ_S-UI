import { computed } from 'vue'
import store from '@/store'

const useIsMobile = () => {
  const isMobile = computed(() => store.getters.ui.isMobile)
  return {
    isMobile
  }
}

export default useIsMobile
