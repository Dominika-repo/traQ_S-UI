import { defineModule } from 'direct-vuex'
import { state } from './state'
import { getters } from './getters'
import { mutations } from './mutations'
import { actions } from './actions'
import { listeners } from './listeners'
import { channelTree } from './channelTree'
import { me } from './me'
import { messagesView } from './messagesView'
import { rtc } from './rtc'
import { stampCategory } from './stampCategory'

/**
 * entitiesでないサーバーの情報を扱うstore
 *
 * listenersでwebsocketを受け取ったり、entitiesの変更を受け取ったりする
 */
export const domain = defineModule({
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
  modules: {
    channelTree,
    me,
    messagesView,
    rtc,
    stampCategory
  }
})
listeners()
