import { defineActions } from 'direct-vuex'
import { moduleActionContext } from '@/store'
import { rtc } from './index'
import apis from '@/lib/apis'
import { ChannelId, UserId } from '@/types/entity-ids'
import { randomString } from '@/lib/util/randomString'
import { client, initClient, destroyClient } from '@/lib/webrtc/traQRTCClient'
import AudioStreamMixer, {
  getTalkingLoundnessLevel
} from '@/lib/audioStreamMixer'
import { getUserAudio } from '@/lib/webrtc/userMedia'
import { UserSessionState, SessionId } from './state'
import { changeRTCState } from '@/lib/websocket'
import { WebRTCUserStateSessions } from '@traptitech/traq'
import { ActionContext } from 'vuex'
import { tts } from '@/lib/tts'

const defaultState = 'joined'
const talkingStateUpdateFPS = 30

export const rtcActionContext = (context: ActionContext<unknown, unknown>) =>
  moduleActionContext(context, rtc)

const updateTalkingUserState = (context: ActionContext<unknown, unknown>) => {
  const { rootState, state, commit, getters } = rtcActionContext(context)
  const update = () => {
    const myId = rootState.domain.me.detail?.id
    const userStateDiff: Record<UserId, number> = {}

    getters.currentSessionUsers.forEach(userId => {
      if (userId === myId) return

      const loudness = getters.currentMutedUsers.includes(userId)
        ? 0
        : getters.getTalkingLoudnessLevel(userId)
      if (state.talkingUsersState[userId] !== loudness) {
        userStateDiff[userId] = loudness
      }
    })

    if (state.localAnalyzerNode && myId) {
      const level = state.mixer?.getLevelOfNode(state.localAnalyzerNode) ?? 0
      const loudness = getTalkingLoundnessLevel(level)
      if (state.talkingUsersState[myId] !== loudness) {
        userStateDiff[myId] = loudness
      }
    }

    commit.updateTalkingUserState(userStateDiff)
  }
  const id = window.setInterval(update, 1000 / talkingStateUpdateFPS)
  commit.setTalkingStateUpdateId(id)
}

export const actions = defineActions({
  // ---- RTC Session ---- //
  async fetchRTCState(context) {
    const { commit } = rtcActionContext(context)
    const { data } = await apis.getWebRTCState()
    if (data) {
      commit.setRTCState(data.flat(1))
    }
  },

  async syncRTCState(context) {
    const { state } = rtcActionContext(context)
    if (!state.currentRTCState) {
      changeRTCState(null, [])
      return
    }
    const sessionStates = state.currentRTCState.sessionStates
    const userStateSessions: WebRTCUserStateSessions[] = sessionStates.map(
      s => ({
        state: s.states.join('.'),
        sessionId: s.sessionId
      })
    )
    changeRTCState(state.currentRTCState.channelId, userStateSessions)
  },

  async addRTCSession(context, payload: UserSessionState) {
    const { state, commit, dispatch } = rtcActionContext(context)
    const currentState = state.currentRTCState
    if (!currentState) return
    commit.setCurrentRTCState({
      channelId: currentState.channelId,
      sessionStates: [...currentState.sessionStates, payload]
    })
    await dispatch.syncRTCState()
  },
  async removeRTCSession(context, payload: { sessionId: SessionId }) {
    const { state, commit, dispatch } = rtcActionContext(context)
    const currentState = state.currentRTCState
    if (!currentState) return
    const sessionStates = [...currentState.sessionStates]
    const index = sessionStates.findIndex(
      s => s.sessionId === payload.sessionId
    )
    sessionStates.splice(index, 1)
    if (sessionStates.length === 0) {
      commit.unsetCurrentRTCState()
    } else {
      commit.setCurrentRTCState({
        channelId: currentState.channelId,
        sessionStates: sessionStates
      })
    }
    await dispatch.syncRTCState()
  },
  async modifyRTCSession(
    context,
    payload: { sessionId: SessionId; states: string[] }
  ) {
    const { state, commit, dispatch } = rtcActionContext(context)
    const currentState = state.currentRTCState
    const index = currentState?.sessionStates.findIndex(
      s => s.sessionId === payload.sessionId
    )
    if (!currentState || index === undefined || index < 0) return
    const newSessionStates = [...currentState.sessionStates]
    newSessionStates.splice(index, 1, payload)
    commit.setCurrentRTCState({
      channelId: currentState.channelId,
      sessionStates: newSessionStates
    })
    await dispatch.syncRTCState()
  },

  startOrJoinRTCSession(
    context,
    payload: { channelId: ChannelId; sessionType: string }
  ): { sessionId: string; isNewSession: boolean } {
    const { state, commit, dispatch } = rtcActionContext(context)
    if (
      state.currentRTCState &&
      state.currentRTCState.channelId !== payload.channelId
    ) {
      throw `RTC session is already open for channel ${payload.channelId}`
    }
    if (!state.currentRTCState) {
      commit.setCurrentRTCState({
        channelId: payload.channelId,
        sessionStates: []
      })
    }
    const currentSession = state.channelSessionsMap[payload.channelId]
      ?.map(sessionId => state.sessionInfoMap[sessionId])
      .find(session => session?.type === payload.sessionType)
    const sessionId =
      currentSession?.sessionId ?? payload.sessionType + '-' + randomString()
    dispatch.addRTCSession({
      sessionId,
      states: [defaultState]
    })
    return { sessionId, isNewSession: !currentSession }
  },

  // ---- RTC Connection ---- //

  initializeMixer(context) {
    const { state, commit, rootState } = rtcActionContext(context)
    const mixer = new AudioStreamMixer(rootState.app.rtcSettings.masterVolume)

    Object.keys(state.remoteAudioStreamMap).forEach(userId => {
      const stream = state.remoteAudioStreamMap[userId]
      if (stream) {
        mixer.addStream(userId, stream)
      }
    })

    mixer.addFileSource('qall_start', '/static/qall_start.mp3')
    mixer.addFileSource('qall_end', '/static/qall_end.mp3')
    mixer.addFileSource('qall_joined', '/static/qall_joined.mp3')
    mixer.addFileSource('qall_left', '/static/qall_left.mp3')

    commit.setMixer(mixer)
  },

  async establishConnection(context) {
    const { rootState, dispatch } = rtcActionContext(context)
    if (!rootState.domain.me.detail) {
      throw 'application not initialized'
    }
    if (client) {
      client.closeConnection()
    }
    const id = rootState.domain.me.detail.id
    initClient(id)
    client?.addEventListener('connectionerror', e => {
      /* eslint-disable-next-line no-console */
      console.error(`[RTC] Failed to establish connection`)
      if (e.detail.err.type === 'unavailable-id') {
        /* eslint-disable-next-line no-console */
        console.error(`[RTC] Peer Id already in use!`)
      }
      window.alert('接続に失敗しました')
      dispatch.closeConnection()
    })
    await client?.establishConnection()
  },

  closeConnection(context) {
    const { state, commit, dispatch } = rtcActionContext(context)
    if (!client) {
      return
    }
    if (state.mixer) {
      state.mixer.playFileSource('qall_end')
      state.mixer.muteAll()
      dispatch.stopTalkStateUpdate()
    }
    client.closeConnection()
    destroyClient()
    commit.unsetMixer()
    commit.unsetLocalStream()
    commit.clearRemoteStream()
  },

  async joinVoiceChannel(context, room: string) {
    const {
      state,
      commit,
      rootState,
      dispatch,
      rootDispatch
    } = rtcActionContext(context)
    if (!rootState.app.rtcSettings.isEnabled) {
      return
    }
    if (!(await rootDispatch.app.rtcSettings.ensureDeviceIds())) {
      window.alert('マイクの設定に失敗しました')
      return
    }

    while (!client) {
      await dispatch.establishConnection()
    }

    dispatch.initializeMixer()
    if (!state.mixer) {
      return
    }
    dispatch.startTalkStateUpdate()

    client.addEventListener('userjoin', e => {
      const userId = e.detail.userId
      /* eslint-disable-next-line no-console */
      console.log(`[RTC] User joined, ID: ${userId}`)
      if (state.mixer) {
        state.mixer.playFileSource('qall_joined')
      }
    })

    client.addEventListener('userleave', async e => {
      const userId = e.detail.userId
      /* eslint-disable-next-line no-console */
      console.log(`[RTC] User left, ID: ${userId}`)
      commit.removeRemoteStream(userId)

      if (state.mixer) {
        await state.mixer.removeStream(userId)
        state.mixer.playFileSource('qall_left')
      }
    })

    client.addEventListener('streamchange', async e => {
      const stream = e.detail.stream
      const userId = stream.peerId
      /* eslint-disable-next-line no-console */
      console.log(`[RTC] Recieved stream from ${stream.peerId}`)
      commit.addRemoteStream({ userId, mediaStream: stream })

      if (state.mixer) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await state.mixer.addStream(stream.peerId, stream)
      }
      commit.setUserVolume({ userId, volume: 0.5 })
    })

    const localStream = await getUserAudio(
      rootState.app.rtcSettings.audioInputDeviceId
    )
    commit.setLocalStream(localStream)

    if (state.isMicMuted) {
      dispatch.mute()
    } else {
      dispatch.unmute()
    }

    await client.joinRoom(room, localStream)

    state.mixer.playFileSource('qall_start')
  },
  mute(context) {
    const { state, commit, getters, dispatch } = rtcActionContext(context)
    const qallSession = getters.qallSession
    if (!state.localStream || !qallSession) {
      return
    }
    commit.muteLocalStream()
    const states = [...new Set([...(qallSession?.states ?? []), 'micmuted'])]
    dispatch.modifyRTCSession({
      sessionId: qallSession?.sessionId,
      states
    })
  },
  unmute(context) {
    const { state, commit, getters, dispatch } = rtcActionContext(context)
    const qallSession = getters.qallSession
    if (!state.localStream || !qallSession) {
      return
    }
    commit.unmuteLocalStream()
    const stateSet = new Set(qallSession?.states ?? [])
    stateSet.delete('micmuted')
    const states = [...stateSet]
    dispatch.modifyRTCSession({
      sessionId: qallSession?.sessionId,
      states
    })
  },

  startTalkStateUpdate(context) {
    updateTalkingUserState(context)
  },
  stopTalkStateUpdate(context) {
    const { state } = rtcActionContext(context)
    clearInterval(state.talkingStateUpdateId)
  },

  // ---- Specific RTC Session ---- //
  async startQall(context, channelId: ChannelId) {
    const { dispatch, rootCommit } = rtcActionContext(context)
    try {
      const { sessionId } = await dispatch.startOrJoinRTCSession({
        channelId,
        sessionType: 'qall'
      })
      dispatch.joinVoiceChannel(sessionId)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Qallの開始に失敗しました', e)

      rootCommit.ui.toast.addToast({
        type: 'error',
        text: 'Qallの開始に失敗しました'
      })
    }
  },

  async endQall(context) {
    const { getters, dispatch } = rtcActionContext(context)
    const qallSession = getters.qallSession
    if (!qallSession) {
      throw 'something went wrong'
    }
    await dispatch.closeConnection()
    dispatch.removeRTCSession({ sessionId: qallSession.sessionId })

    tts.stop()
  }
})
