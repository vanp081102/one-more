export class ScreenShake {
  private trauma = 0
  offsetX = 0
  offsetY = 0

  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount)
  }

  update(dt: number): void {
    if (this.trauma <= 0) {
      this.offsetX = 0
      this.offsetY = 0
      return
    }
    const shake = this.trauma * this.trauma
    this.offsetX = (Math.random() * 2 - 1) * shake * 10
    this.offsetY = (Math.random() * 2 - 1) * shake * 10
    this.trauma = Math.max(0, this.trauma - dt * 2.5)
  }

  reset(): void {
    this.trauma = 0
    this.offsetX = 0
    this.offsetY = 0
  }
}
