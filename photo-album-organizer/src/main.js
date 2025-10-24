import './style.css'
import { App } from './components/App.js'

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  window.app = new App()
  await window.app.init()
})
