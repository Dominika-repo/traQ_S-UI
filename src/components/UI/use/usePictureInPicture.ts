import { checkMediaSessionSupport } from '@/lib/util/browser'

const usePictureInPicture = () => {
  const isMediaSessionSupported = checkMediaSessionSupport()

  const showPictureInPictureWindow = async (
    audio: HTMLAudioElement,
    iconId: string
  ) => {
    const $img = new Image()
    $img.src = `/api/v3/files/${iconId}`
    await $img.decode()

    const $canvas = document.createElement('canvas')
    $canvas.width = $canvas.height = 512
    $canvas.getContext('2d')?.drawImage($img, 0, 0, 512, 512)
    const videoStream = $canvas.captureStream()

    // PinPは動画しか行えないのでvideoを作る
    const $video = document.createElement('video')
    $video.srcObject = videoStream
    $video.muted = true
    $video.style.display = 'none'
    $video.addEventListener('play', () => {
      audio.play()
    })
    $video.addEventListener('pause', () => {
      audio.pause()
    })
    $video.addEventListener('leavepictureinpicture', () => {
      // $videoはPinPにしたときに毎回生成されるのでremove
      $video.remove()

      if (isMediaSessionSupported) {
        // mediaSessionを削除しないと次mediaSessionを使うときにバグるのでここで削除
        audio.pause()
        const src = audio.src
        const currentTime = audio.currentTime
        audio.src = '' // srcを空にすることでmediaSessionの解放が行える
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)

        // メッセージ内のaudioの表示や位置の復元
        audio.src = src
        audio.currentTime = currentTime
      }
    })

    if (isMediaSessionSupported) {
      // MediaStreamを利用しているときはMediaSessionAPIを利用しないとPinPの再生/停止ボタンが表示されないため
      $video.addEventListener('enterpictureinpicture', () => {
        navigator.mediaSession.setActionHandler('play', () => {
          ;(document.pictureInPictureElement as HTMLVideoElement).play()
          navigator.mediaSession.playbackState = 'playing'
        })
        navigator.mediaSession.setActionHandler('pause', () => {
          ;(document.pictureInPictureElement as HTMLVideoElement).pause()
          navigator.mediaSession.playbackState = 'paused'
        })
      })
    }

    $video.addEventListener('loadedmetadata', async () => {
      await $video.play()
      await $video.requestPictureInPicture()
    })
    document.body.append($video)
  }
  return { showPictureInPictureWindow }
}

export default usePictureInPicture
