import { createDefineListeners } from '../../utils/defineListeners'
import { wsListener } from '@/lib/websocket'
import { messageMitt } from '@/store/entities/messages'
import { me } from '.'

export const defineWsListeners = createDefineListeners<typeof me>()(
  wsListener,
  (listener, { dispatch }) => {
    listener.on('USER_UPDATED', ({ id }) => {
      dispatch.onUserUpdated(id)
    })
    listener.on('USER_ICON_UPDATED', ({ id }) => {
      dispatch.onUserUpdated(id)
    })

    listener.on('MESSAGE_READ', ({ id }) => {
      dispatch.onChannelRead(id)
    })

    listener.on('CHANNEL_STARED', ({ id }) => {
      dispatch.onAddStaredChannel(id)
    })
    listener.on('CHANNEL_DELETED', ({ id }) => {
      dispatch.onDeleteStaredChannel(id)
    })

    listener.on('reconnect', () => {
      dispatch.fetchMe()
      dispatch.fetchUnreadChannels({ ignoreCache: true })
      dispatch.fetchStaredChannels({ ignoreCache: true })
      dispatch.fetchSubscriptions({ ignoreCache: true })
    })
  }
)

export const defineMessageListeners = createDefineListeners<typeof me>()(
  messageMitt,
  (listener, { dispatch }) => {
    listener.on('addMessage', message => {
      dispatch.onMessageCreated(message)
    })
  }
)
