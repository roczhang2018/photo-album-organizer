/**
 * Main Application Component
 * Handles routing and overall application state
 */
import { databaseService } from '../services/Database.js'
import { albumService } from '../services/AlbumService.js'
import { photoService } from '../services/PhotoService.js'
import { router } from '../services/Router.js'
import { AlbumGrid } from './AlbumGrid.js'
import { AlbumDetail } from './AlbumDetail.js'
import { getCurrentWeekGroup, formatWeekGroup } from '../utils/dateUtils.js'

export class App {
  constructor() {
    this.currentRoute = null
    this.isInitialized = false
    this.setupRoutes()
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // Add routes
    router.addRoute('/', this.handleHomeRoute.bind(this))
    router.addRoute('/album/:id', this.handleAlbumRoute.bind(this))
    router.addRoute('*', this.handle404Route.bind(this))
    
    // Set up route hooks
    router.setBeforeRouteChange((from, to) => {
      console.log(`Navigating from ${from?.fullPath || 'unknown'} to ${to}`)
      return true
    })
    
    router.setAfterRouteChange((from, to) => {
      console.log(`Navigation completed to ${to}`)
    })
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('Starting application initialization...')
      
      // Initialize database
      console.log('Initializing database...')
      await databaseService.init()
      console.log('Database initialized successfully')
      
      this.isInitialized = true
      
      // Initialize router
      console.log('Initializing router...')
      router.init()
      console.log('Router initialized successfully')
      
      console.log('Application initialized successfully')
    } catch (error) {
      console.error('Failed to initialize application:', error)
      this.renderError('Failed to initialize application. Please refresh the page.')
    }
  }

  /**
   * Handle home route
   * @param {Object} route - Route information
   */
  async handleHomeRoute(route) {
    try {
      console.log('App: Handling home route...')
      this.currentRoute = route
      const app = document.querySelector('#app')
      console.log('App: Rendering home page...')
      app.innerHTML = await this.renderHome()
      
      // Initialize album grid
      const albumGridContainer = app.querySelector('#album-grid-container')
      console.log('App: Album grid container found:', !!albumGridContainer)
      if (albumGridContainer) {
        console.log('App: Initializing album grid...')
        this.albumGrid = new AlbumGrid(albumGridContainer)
        await this.albumGrid.init()
        console.log('App: Album grid initialized successfully')
      } else {
        console.error('App: Album grid container not found!')
      }
    } catch (error) {
      console.error('App: Error in handleHomeRoute:', error)
      const app = document.querySelector('#app')
      app.innerHTML = this.renderError('Failed to load home page: ' + error.message)
    }
  }

  /**
   * Handle album route
   * @param {Object} route - Route information
   */
  async handleAlbumRoute(route) {
    this.currentRoute = route
    const app = document.querySelector('#app')
    app.innerHTML = await this.renderAlbum(route.params.id)
    
    // Initialize album detail component
    const albumDetailContainer = app.querySelector('#album-detail-container')
    if (albumDetailContainer) {
      this.albumDetail = new AlbumDetail(albumDetailContainer, route.params.id)
      await this.albumDetail.init()
    }
  }

  /**
   * Handle 404 route
   * @param {Object} route - Route information
   */
  handle404Route(route) {
    this.currentRoute = route
    const app = document.querySelector('#app')
    app.innerHTML = this.render404()
  }

  /**
   * Navigate to a new route
   * @param {string} path - The path to navigate to
   */
  navigate(path) {
    return router.navigate(path)
  }

  /**
   * Render home page (album list)
   */
  async renderHome() {
    if (!this.isInitialized) {
      return this.renderLoading()
    }

    try {
      const albums = await albumService.getAlbums()
      
      return `
        <div class="app">
          <header class="app-header">
            <h1>Photo Album Organizer</h1>
            <p>Organize your photos into date-grouped albums</p>
            <div class="db-stats">
              <span>Albums: ${albums.length}</span>
              <span>Database: ${this.isInitialized ? 'Ready' : 'Loading...'}</span>
              <span id="db-mode" style="color: #666; font-size: 0.9em;"></span>
              <button onclick="window.app.testDatabase()" style="margin-left: 10px; padding: 5px 10px;">
                Test DB
              </button>
            </div>
          </header>
          
          <main class="app-main">
            <div id="album-grid-container"></div>
          </main>
          
          <footer class="app-footer">
            <p>Built with Vite + Vanilla JavaScript + SQLite</p>
          </footer>
        </div>
      `
    } catch (error) {
      console.error('Failed to render home:', error)
      return this.renderError('Failed to load albums. Please refresh the page.')
    }
  }

  /**
   * Render album detail page
   * @param {string} albumId - The album ID
   */
  async renderAlbum(albumId) {
    if (!this.isInitialized) {
      return this.renderLoading()
    }

    return `
      <div class="app">
        <div id="album-detail-container"></div>
      </div>
    `
  }

  /**
   * Render 404 page
   */
  render404() {
    return `
      <div class="app">
        <header class="app-header">
          <h1>Page Not Found</h1>
        </header>
        
        <main class="app-main">
          <div class="error-page">
            <h2>404</h2>
            <p>The page you're looking for doesn't exist.</p>
            <button onclick="window.history.back()">Go Back</button>
          </div>
        </main>
      </div>
    `
  }

  /**
   * Render loading state
   */
  renderLoading() {
    return `
      <div class="app">
        <div class="loading">
          <h1>Photo Album Organizer</h1>
          <p>Initializing database...</p>
        </div>
      </div>
    `
  }

  /**
   * Render error state
   * @param {string} message - Error message
   */
  renderError(message) {
    return `
      <div class="app">
        <header class="app-header">
          <h1>Photo Album Organizer</h1>
        </header>
        
        <main class="app-main">
          <div class="error-page">
            <h2>Error</h2>
            <p>${message}</p>
            <button onclick="location.reload()">Reload Page</button>
          </div>
        </main>
      </div>
    `
  }

  /**
   * Create a sample album for testing
   */
  async createSampleAlbum() {
    try {
      const currentWeek = getCurrentWeekGroup()
      await albumService.createAlbum('Sample Album', currentWeek, 0)
      
      // Navigate to home to refresh the view
      this.navigate('/')
    } catch (error) {
      console.error('Failed to create sample album:', error)
      alert('Failed to create sample album: ' + error.message)
    }
  }

  /**
   * Test database functionality
   */
  async testDatabase() {
    try {
      console.log('Testing database...')
      
      // Test database stats
      const stats = databaseService.getStats()
      console.log('Database stats:', stats)
      
      // Update database mode display
      const dbModeElement = document.getElementById('db-mode')
      if (dbModeElement) {
        const modeText = stats.mode === 'mock' ? '(Mock DB)' : 
                        stats.mode === 'sqlite' ? '(SQLite)' : 
                        stats.mode === 'error' ? '(Error)' : ''
        dbModeElement.textContent = modeText
      }
      
      // Test creating a sample album
      const currentWeek = getCurrentWeekGroup()
      console.log('Current week group:', currentWeek)
      
      const sampleAlbum = await albumService.createAlbum('Test Album', currentWeek, 0)
      console.log('Created sample album:', sampleAlbum)
      
      // Test getting albums
      const albums = await albumService.getAlbums()
      console.log('All albums:', albums)
      
      alert(`Database test successful!\nMode: ${stats.mode}\nAlbums: ${albums.length}\nStats: ${JSON.stringify(stats, null, 2)}`)
      
      // Refresh the view
      this.navigate('/')
    } catch (error) {
      console.error('Database test failed:', error)
      alert('Database test failed: ' + error.message)
    }
  }

  /**
   * Format file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
