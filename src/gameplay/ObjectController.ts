export class ObjectController {
  x = 0
  radius = 14
  private moving = false
  private direction: 1 | -1 = 1

  reset(startX: number, direction: 1 | -1 = 1): void {
    this.direction = direction
    this.x = startX
    this.moving = false
  }

  getDirection(): 1 | -1 {
    return this.direction
  }

  startMoving(): void {
    this.moving = true
  }

  stopMoving(): void {
    this.moving = false
  }

  isMoving(): boolean {
    return this.moving
  }

  update(dt: number, speed: number): void {
    if (!this.moving) return
    this.x += speed * dt * this.direction
  }
}
