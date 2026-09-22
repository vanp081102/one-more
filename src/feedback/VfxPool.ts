interface Particle {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

export class VfxPool {
  private readonly particles: Particle[] = []

  constructor(capacity = 64) {
    for (let i = 0; i < capacity; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        size: 2,
        color: '#ffffff',
      })
    }
  }

  burst(x: number, y: number, count: number, color: string, speed = 120): void {
    let spawned = 0
    for (const p of this.particles) {
      if (p.active) continue
      const angle = Math.random() * Math.PI * 2
      const mag = speed * (0.4 + Math.random() * 0.8)
      p.active = true
      p.x = x
      p.y = y
      p.vx = Math.cos(angle) * mag
      p.vy = Math.sin(angle) * mag
      p.maxLife = 0.25 + Math.random() * 0.35
      p.life = p.maxLife
      p.size = 2 + Math.random() * 3
      p.color = color
      spawned += 1
      if (spawned >= count) break
    }
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        continue
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.96
      p.vy *= 0.96
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (!p.active) continue
      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  clear(): void {
    for (const p of this.particles) p.active = false
  }
}
