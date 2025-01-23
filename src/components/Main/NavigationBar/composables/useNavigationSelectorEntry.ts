import { computed, reactive } from 'vue'
import type {
  NavigationItemType,
  EphemeralNavigationItemType
} from './useNavigationConstructor'
import type { ThemeClaim } from '/@/lib/styles'
import { isDefined } from '/@/lib/basic/array'
import { useMessageInputStateStore } from '/@/store/ui/messageInputStateStore'
import { useAudioController } from '/@/store/ui/audioController'
import { useChannelsStore } from '/@/store/entities/channels'
import { useSubscriptionStore } from '/@/store/domain/subscription'

export type NavigationSelectorEntry = {
  type: NavigationItemType
  iconName: string
  iconMdi?: boolean
  hasNotification?: boolean
}

export type EphemeralNavigationSelectorEntry = {
  type: EphemeralNavigationItemType
  iconName: string
  iconMdi?: boolean
  colorClaim?: ThemeClaim<string> // 色
  selectOnAdd?: boolean
}

export const createItems = (notificationState: {
  channel: boolean
  dm: boolean
}): NavigationSelectorEntry[] => [
  {
    type: 'home',
    iconName: 'home',
    iconMdi: true,
    hasNotification: notificationState.channel
  },
  {
    type: 'channels',
    iconName: 'hash'
  },
  {
    type: 'activity',
    iconName: 'activity'
  },
  {
    type: 'users',
    iconName: 'user',
    hasNotification: notificationState.dm
  },
  {
    type: 'clips',
    iconName: 'bookmark',
    iconMdi: true
  }
]
export const ephemeralItems: Record<
  NonNullable<EphemeralNavigationItemType>,
  EphemeralNavigationSelectorEntry
> = {
  qallController: {
    type: 'qallController',
    iconName: 'phone',
    iconMdi: true,
    colorClaim: (_, common) => common.ui.qall,
    selectOnAdd: true
  },
  draftList: {
    type: 'draftList',
    iconName: 'pencil',
    iconMdi: true
  },
  audioController: {
    type: 'audioController',
    iconName: 'music-note',
    iconMdi: true
  }
}

const useNavigationSelectorEntry = () => {
  const { unreadChannelsMap } = useSubscriptionStore()
  const { channelsMap, dmChannelsMap } = useChannelsStore()
  const { hasInputChannel } = useMessageInputStateStore()
  const { fileId } = useAudioController()

  const unreadChannels = computed(() => [...unreadChannelsMap.value.values()])
  const notificationState = reactive({
    channel: computed(() =>
      unreadChannels.value.some(c => channelsMap.value.has(c.channelId))
    ),
    dm: computed(() =>
      unreadChannels.value.some(c => dmChannelsMap.value.has(c.channelId))
    )
  })
  const entries = computed(() => createItems(notificationState))

  const hasActiveQallSession = computed(() => false) // TODO: Qall
  const ephemeralEntries = computed(() =>
    [
      // TODO: Qall
      // 適切な変数を置く
      hasActiveQallSession.value ? ephemeralItems.qallController : undefined,
      hasInputChannel.value ? ephemeralItems.draftList : undefined,
      fileId.value ? ephemeralItems.audioController : undefined
    ].filter(isDefined)
  )

  return {
    entries,
    ephemeralEntries
  }
}
export default useNavigationSelectorEntry
