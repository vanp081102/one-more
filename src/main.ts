import { GameApp } from './core/GameApp'
import './styles.css'

const appRoot = document.querySelector<HTMLElement>('#app')
if (!appRoot) {
  throw new Error('#app missing')
}

new GameApp(appRoot)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch(() => {
      // offline install optional
    })
  })
}
