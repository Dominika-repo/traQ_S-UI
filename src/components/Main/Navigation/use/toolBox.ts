import store from '@/store'
import { computed } from 'vue'
import usePopupMenu from '../../MainView/ChannelView/use/popupMenu'
import { useCommandPaletteInvoker } from '@/providers/commandPalette'
import { useRouter } from 'vue-router'
import { RouteName } from '@/router'

interface Tool {
  iconName: string
  iconMdi?: true
  disabled?: boolean
  onClick: () => void
}

const useToolBox = () => {
  const { isPopupMenuShown, closePopupMenu, togglePopupMenu } = usePopupMenu()
  const router = useRouter()

  const { openCommandPalette } = useCommandPaletteInvoker()
  const openQrCodeModal = () =>
    store.dispatch.ui.modal.pushModal({ type: 'qrcode' })
  const openSettings = () => router.push({ name: RouteName.Settings })

  const tools = computed(() => {
    const tools: Tool[] = []
    tools.push({
      iconName: 'search',
      iconMdi: true,
      onClick: () => openCommandPalette('search')
    })
    tools.push({
      iconName: 'apps',
      iconMdi: true,
      onClick: togglePopupMenu
    })
    if (window.traQConfig.showQrCodeButton) {
      tools.push({
        iconName: 'qrcode',
        iconMdi: true,
        onClick: openQrCodeModal
      })
    }
    tools.push({
      iconName: 'cog',
      iconMdi: true,
      onClick: openSettings
    })
    return tools
  })

  return {
    isServicesShown: isPopupMenuShown,
    closeServices: closePopupMenu,
    toggleServices: togglePopupMenu,
    tools
  }
}

export default useToolBox
