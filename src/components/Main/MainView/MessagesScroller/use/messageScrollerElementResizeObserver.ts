import { Ref, computed } from 'vue'
import { MessageId } from '@/types/entity-ids'
import { LoadingDirection } from '@/_store/domain/messagesView/state'
import store from '@/store'

const useMessageScrollerElementResizeObserver = (
  rootRef: Ref<HTMLElement | null>,
  scrollerProps: {
    lastLoadingDirection: LoadingDirection
    entryMessageId?: MessageId
  },
  viewPortState: {
    height: number
  }
) => {
  const entryMessageDate = computed(() => {
    if (scrollerProps.entryMessageId) {
      const message = store.state.entities.messages.messagesMap.get(
        scrollerProps.entryMessageId
      )
      return message ? new Date(message.createdAt) : undefined
    }
    return undefined
  })

  const onChangeHeight = (payload: {
    heightDiff: number
    top: number
    bottom: number
    lastTop: number
    lastBottom: number
    date?: string
  }) => {
    if (!rootRef.value) {
      return
    }

    if (
      scrollerProps.lastLoadingDirection === 'around' &&
      entryMessageDate.value &&
      payload.date
    ) {
      // エントリーメッセージがあり、かつ初回ロードの場合、メッセージの時刻を確認する
      // エントリーより過去だった場合、エントリーより上にあるのでスクロール位置をずらす
      const messageDate = new Date(payload.date)
      if (messageDate < entryMessageDate.value) {
        rootRef.value.scrollTop += payload.heightDiff
        viewPortState.height += payload.heightDiff
      }
    } else if (
      scrollerProps.lastLoadingDirection === 'latest' ||
      scrollerProps.lastLoadingDirection === 'former'
    ) {
      rootRef.value.scrollTop += payload.heightDiff
      viewPortState.height += payload.heightDiff
    }
  }

  const onEntryMessageLoaded = (relativePos: number) => {
    if (!rootRef.value) {
      return
    }
    const rootHeight = rootRef.value.getBoundingClientRect().height
    rootRef.value.scrollTop = relativePos - rootHeight / 3
  }

  return { onChangeHeight, onEntryMessageLoaded }
}

export default useMessageScrollerElementResizeObserver
