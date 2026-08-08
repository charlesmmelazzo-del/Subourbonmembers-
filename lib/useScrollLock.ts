import { useEffect } from 'react'

/**
 * Freezes background scroll while a sheet is open.
 *
 * Ref-counted on purpose: the menu stacks a category panel under an item
 * sheet, and whichever one unmounts first must not hand scrolling back to the
 * page while the other is still covering it.
 */
let locks = 0
let restore = ''

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return
    if (locks === 0) {
      restore = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    locks += 1
    return () => {
      locks -= 1
      if (locks === 0) document.body.style.overflow = restore
    }
  }, [active])
}
