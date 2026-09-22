export const InputAction = {
  Primary: 'PRIMARY_ACTION',
} as const

export type InputAction = (typeof InputAction)[keyof typeof InputAction]

export interface ActionState {
  pressed: boolean
  justPressed: boolean
  justReleased: boolean
}
