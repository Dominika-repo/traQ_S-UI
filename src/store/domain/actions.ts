import { defineActions } from 'direct-vuex'
import { moduleActionContext } from '@/store'
import { domain } from '.'
import { ActionContext } from 'vuex'
import { UserId } from '@/types/entity-ids'
import apis from '@/lib/apis'
import { createSingleflight } from '@/lib/async'

export const domainActionContext = (context: ActionContext<unknown, unknown>) =>
  moduleActionContext(context, domain)

const getOnlineUsers = createSingleflight(apis.getOnlineUsers.bind(apis))

// TODO: fetchのエラー処理
export const actions = defineActions({
  async fetchOnlineUsers(
    context,
    { force = false }: { force?: boolean } = {}
  ): Promise<Set<UserId>> {
    const { state, commit } = domainActionContext(context)
    if (state.onlineUsersFetched && !force) {
      return state.onlineUsers
    }

    const [{ data: userIdsArray }, shared] = await getOnlineUsers()
    const userIds = new Set(userIdsArray)
    if (!shared) {
      commit.setOnlineUsers(new Set(userIds))
    }
    return userIds
  },
  addOnlineUser(context, userId: UserId) {
    const { commit } = domainActionContext(context)
    commit.addOnlineUser(userId)
  },
  deleteOnlineUser(context, userId: UserId) {
    const { commit } = domainActionContext(context)
    commit.deleteOnlineUser(userId)
  }
})
