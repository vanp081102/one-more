import { InputAction, type ActionState } from './InputAction'

/**
 * Maps keyboard / mouse / touch / gamepad into a single PRIMARY_ACTION.
 * Gameplay must never branch on device type.
 */
export class InputManager {
  private keyPressed = false
  private pointerPressed = false
  private padPressed = false
  private wasPressed = false
  private enabled = true
  private readonly cleanups: Array<() => void> = []

  attach(target: HTMLElement | Window = window): void {
    const isPrimaryKey = (code: string) =>
      code === 'Space' || code === 'Enter' || code === 'KeyZ'

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPrimaryKey(e.code) || e.repeat) return
      e.preventDefault()
      this.keyPressed = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (!isPrimaryKey(e.code)) return
      e.preventDefault()
      this.keyPressed = false
    }
    const onPointerDown = (e: Event) => {
      const el = e.target as HTMLElement | null
      if (el?.closest?.('button, .menu, .result-panel, .overlay-panel, .overlay-card, .hud-back')) return
      const pe = e as PointerEvent
      if ('button' in pe && pe.button !== 0 && pe.pointerType === 'mouse') return
      e.preventDefault()
      this.pointerPressed = true
    }
    const onPointerUp = (e: Event) => {
      e.preventDefault()
      this.pointerPressed = false
    }
    const onBlur = () => {
      this.keyPressed = false
      this.pointerPressed = false
      this.padPressed = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    target.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('blur', onBlur)

    this.cleanups.push(() => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      target.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('blur', onBlur)
    })
  }

  detach(): void {
    for (const fn of this.cleanups) fn()
    this.cleanups.length = 0
    this.keyPressed = false
    this.pointerPressed = false
    this.padPressed = false
    this.wasPressed = false
  }

  setEnabled(value: boolean): void {
    this.enabled = value
    if (!value) {
      this.keyPressed = false
      this.pointerPressed = false
      this.padPressed = false
    }
  }

  /**
   * Poll gamepads each frame (A/Cross = 0, X = 2, RT = 7).
   * Call before reading actions.
   */
  poll(): void {
    let pad = false
    if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
      const pads = navigator.getGamepads()
      for (let i = 0; i < pads.length; i++) {
        const g = pads[i]
        if (!g) continue
        const a = g.buttons[0]?.pressed
        const x = g.buttons[2]?.pressed
        const rt = g.buttons[7]?.pressed
        if (a || x || rt) {
          pad = true
          break
        }
      }
    }
    this.padPressed = pad
  }

  private isPressed(): boolean {
    if (!this.enabled) return false
    return this.keyPressed || this.pointerPressed || this.padPressed
  }

  /** Call once per frame after gameplay has consumed edges. */
  endFrame(): void {
    this.wasPressed = this.isPressed()
  }

  getAction(_action: InputAction = InputAction.Primary): ActionState {
    const pressed = this.isPressed()
    return {
      pressed,
      justPressed: pressed && !this.wasPressed,
      justReleased: !pressed && this.wasPressed,
    }
  }
}
