export type Target = {
  word: string
  begin: number
  end: number
  divided: boolean
}

export const getCurrentWord = (
  elm: { selectionStart: number; selectionEnd: number },
  text: string
): Target => {
  text = text.replace(/　/g, ' ')
  const startIndex = elm.selectionStart
  const prevAtMarkIndex = text.lastIndexOf('@', startIndex - 1)
  const prevColonIndex = text.lastIndexOf(':', startIndex - 1)
  const prevPeriodIndex = text.lastIndexOf('.', startIndex - 1)
  const nearest = Math.max(prevAtMarkIndex, prevColonIndex, prevPeriodIndex)
  const begin = Math.max(nearest, 0)
  const end = elm.selectionEnd
  const word = text.substring(begin, end)
  const prevSpaceIndex = text.lastIndexOf(' ', startIndex - 1)
  const divided = prevSpaceIndex > nearest
  return { word, begin, end, divided }
}

export const getDeterminedCharacters = (candidates: string[]) => {
  if (candidates.length <= 0) return ''

  candidates = candidates.map(candidate => candidate.toLocaleLowerCase())
  const minLength = Math.min(...candidates.map(c => [...c].length))
  const confirmedPart: string[] = []
  for (let i = 0; i < minLength; i++) {
    confirmedPart[i] = [...candidates[0]][i]
    for (const candidate of candidates) {
      if (confirmedPart[i] !== [...candidate][i]) {
        return confirmedPart.slice(0, confirmedPart.length - 1).join('')
      }
    }
  }
  return confirmedPart.join('')
}

export const getPrevCandidateIndex = (
  list: readonly unknown[],
  selectedIndex: number | null
) => {
  if (selectedIndex === null) {
    // 候補が一件のときは確定部分ではなく候補のほうを返す
    // こうすると大文字小文字が元のものになる
    if (list.length === 1) {
      return 0
    }
    return -1
  }
  if (selectedIndex <= -1) {
    return list.length - 1
  }
  return selectedIndex - 1
}

export const getNextCandidateIndex = (
  list: readonly unknown[],
  selectedIndex: number | null
) => {
  if (selectedIndex === null) {
    // 候補が一件のときは確定部分ではなく候補のほうを返す
    // こうすると大文字小文字が元のものになる
    if (list.length === 1) {
      return 0
    }
    return -1
  }
  if (selectedIndex >= list.length - 1) {
    return -1
  }
  return selectedIndex + 1
}
