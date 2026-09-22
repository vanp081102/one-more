export class ComboSystem {
  private combo = 0
  private maxCombo = 0

  getCombo(): number {
    return this.combo
  }

  getMaxCombo(): number {
    return this.maxCombo
  }

  reset(): void {
    this.combo = 0
    this.maxCombo = 0
  }

  resetComboOnly(): void {
    this.combo = 0
  }

  hit(): number {
    this.combo += 1
    if (this.combo > this.maxCombo) this.maxCombo = this.combo
    return this.combo
  }

  miss(): void {
    this.combo = 0
  }
}
