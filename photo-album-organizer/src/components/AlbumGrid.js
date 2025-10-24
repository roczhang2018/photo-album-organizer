/**
 * Album Grid Component
 * Handles album display and management UI
 */
import { albumService } from '../services/AlbumService.js'
import { photoService } from '../services/PhotoService.js'
import { getCurrentWeekGroup, formatWeekGroup, sortWeekGroups } from '../utils/dateUtils.js'

export class AlbumGrid {
  constructor(container) {
    this.container = container
    this.albums = []
    this.albumsByWeek = {}
    this.isLoading = false
  }

  /**
   * Initialize the album grid
   */
  async init() {
    this.render()
    await this.loadAlbums()
  }

  /**
   * Load albums from database
   */
  async loadAlbums() {
    try {
      console.log('AlbumGrid: Starting to load albums...')
      this.setLoading(true)
      
      console.log('AlbumGrid: Calling albumService.getAlbums()...')
      const albums = await albumService.getAlbums()
      console.log('AlbumGrid: Got albums:', albums)
      this.albums = albums
      
      // Group albums by week
      console.log('AlbumGrid: Grouping albums by week...')
      this.albumsByWeek = await albumService.getAlbumsByWeek()
      console.log('AlbumGrid: Albums grouped by week:', this.albumsByWeek)
      
      this.render()
    } catch (error) {
      console.error('AlbumGrid: Failed to load albums:', error)
      this.renderError('Failed to load albums. Please refresh the page.')
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Render the album grid
   */
  render() {
    if (this.isLoading) {
      this.container.innerHTML = this.renderLoading()
      return
    }

    if (Object.keys(this.albumsByWeek).length === 0) {
      this.container.innerHTML = this.renderEmptyState()
      return
    }

    this.container.innerHTML = this.renderAlbumGrid()
    this.attachEventListeners()
  }

  /**
   * Render loading state
   */
  renderLoading() {
    return `
      <div class="album-grid-loading">
        <div class="loading-spinner"></div>
        <p>Loading albums...</p>
      </div>
    `
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    return `
      <div class="album-grid-empty">
        <div class="empty-state">
          <h3>No albums yet</h3>
          <p>Create your first album to get started organizing your photos.</p>
          <button class="create-album-btn" data-action="create-album">
            Create Sample Album
          </button>
        </div>
      </div>
    `
  }

  /**
   * Render album grid
   */
  renderAlbumGrid() {
    const sortedWeekGroups = sortWeekGroups(Object.keys(this.albumsByWeek))
    
    return `
      <div class="album-grid-container">
        ${sortedWeekGroups.map(weekGroup => this.renderWeekGroup(weekGroup)).join('')}
      </div>
    `
  }

  /**
   * Render a week group section
   * @param {string} weekGroup - Week group string
   */
  renderWeekGroup(weekGroup) {
    const weekAlbums = this.albumsByWeek[weekGroup] || []
    
    return `
      <div class="week-group" data-week-group="${weekGroup}">
        <div class="week-group-header">
          <h2 class="week-group-title">${formatWeekGroup(weekGroup)}</h2>
          <button class="add-album-btn" data-action="create-album" data-week-group="${weekGroup}">
            + Add Album
          </button>
        </div>
        <div class="album-grid" data-week-group="${weekGroup}">
          ${weekAlbums.map(album => this.renderAlbumCard(album)).join('')}
        </div>
      </div>
    `
  }

  /**
   * Render an album card
   * @param {Object} album - Album data
   */
  renderAlbumCard(album) {
    return `
      <div class="album-card" 
           data-album-id="${album.id}" 
           draggable="true"
           role="button"
           tabindex="0"
           aria-label="Album: ${this.escapeHtml(album.name)}. ${album.photoCount} photos. Week: ${formatWeekGroup(album.weekGroup)}"
           aria-describedby="album-${album.id}-description">
        <div class="album-card-header">
          <h3 class="album-title" id="album-${album.id}-title">${this.escapeHtml(album.name)}</h3>
          <div class="album-actions" role="group" aria-label="Album actions">
            <button class="album-action-btn" 
                    data-action="edit-album" 
                    data-album-id="${album.id}" 
                    title="Edit Album"
                    aria-label="Edit album ${this.escapeHtml(album.name)}">
              ✏️
            </button>
            <button class="album-action-btn" 
                    data-action="delete-album" 
                    data-album-id="${album.id}" 
                    title="Delete Album"
                    aria-label="Delete album ${this.escapeHtml(album.name)}">
              🗑️
            </button>
          </div>
        </div>
        <div class="album-preview">
          <div class="photo-placeholder" aria-hidden="true">📷</div>
          <div class="album-stats" id="album-${album.id}-description">
            <span class="photo-count" aria-label="Photo count">${album.photoCount} photos</span>
          </div>
        </div>
        <div class="album-card-footer">
          <span class="album-date" aria-label="Week group">${formatWeekGroup(album.weekGroup)}</span>
        </div>
      </div>
    `
  }

  /**
   * Render error state
   * @param {string} message - Error message
   */
  renderError(message) {
    this.container.innerHTML = `
      <div class="album-grid-error">
        <div class="error-state">
          <h3>Error</h3>
          <p>${this.escapeHtml(message)}</p>
          <button class="retry-btn" data-action="retry-load">
            Retry
          </button>
        </div>
      </div>
    `
    this.attachEventListeners()
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Album card clicks
    this.container.addEventListener('click', (e) => {
      const albumCard = e.target.closest('.album-card')
      if (albumCard && !e.target.closest('.album-actions')) {
        const albumId = albumCard.dataset.albumId
        this.navigateToAlbum(albumId)
      }
    })

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const albumCard = e.target.closest('.album-card')
        if (albumCard) {
          e.preventDefault()
          const albumId = albumCard.dataset.albumId
          this.navigateToAlbum(albumId)
        }
      }
    })

    // Action buttons
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action
      const albumId = e.target.dataset.albumId
      const weekGroup = e.target.dataset.weekGroup

      switch (action) {
        case 'create-album':
          this.showCreateAlbumDialog(weekGroup)
          break
        case 'edit-album':
          this.showEditAlbumDialog(albumId)
          break
        case 'delete-album':
          this.showDeleteAlbumDialog(albumId)
          break
        case 'retry-load':
          this.loadAlbums()
          break
      }
    })

    // Drag and drop events
    this.attachDragAndDropListeners()
  }

  /**
   * Attach drag and drop event listeners
   */
  attachDragAndDropListeners() {
    const albumCards = this.container.querySelectorAll('.album-card')
    
    albumCards.forEach(card => {
      // Drag start
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.albumId)
        e.dataTransfer.effectAllowed = 'move'
        card.classList.add('dragging')
        
        // Add visual feedback
        this.showDragFeedback(card)
      })

      // Drag end
      card.addEventListener('dragend', (e) => {
        card.classList.remove('dragging')
        this.hideDragFeedback()
        this.clearAllDropZones()
      })

      // Touch support for mobile
      this.addTouchSupport(card)
    })

    const albumGrids = this.container.querySelectorAll('.album-grid')
    
    albumGrids.forEach(grid => {
      // Drag over
      grid.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        grid.classList.add('drag-over')
        this.showDropZoneIndicator(grid)
      })

      // Drag enter
      grid.addEventListener('dragenter', (e) => {
        e.preventDefault()
        grid.classList.add('drag-over')
      })

      // Drag leave
      grid.addEventListener('dragleave', (e) => {
        // Only remove if leaving the grid entirely
        if (!grid.contains(e.relatedTarget)) {
          grid.classList.remove('drag-over')
          this.hideDropZoneIndicator(grid)
        }
      })

      // Drop
      grid.addEventListener('drop', (e) => {
        e.preventDefault()
        grid.classList.remove('drag-over')
        this.hideDropZoneIndicator(grid)
        
        const albumId = e.dataTransfer.getData('text/plain')
        const targetWeekGroup = grid.dataset.weekGroup
        
        this.handleAlbumMove(albumId, targetWeekGroup)
      })
    })
  }

  /**
   * Add touch support for mobile devices
   * @param {HTMLElement} card - Album card element
   */
  addTouchSupport(card) {
    let startX = 0
    let startY = 0
    let isDragging = false
    let dragThreshold = 10

    card.addEventListener('touchstart', (e) => {
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      isDragging = false
    }, { passive: true })

    card.addEventListener('touchmove', (e) => {
      if (!isDragging) {
        const touch = e.touches[0]
        const deltaX = Math.abs(touch.clientX - startX)
        const deltaY = Math.abs(touch.clientY - startY)
        
        if (deltaX > dragThreshold || deltaY > dragThreshold) {
          isDragging = true
          card.classList.add('dragging')
          this.showDragFeedback(card)
          
          // Show drop zones
          this.showAllDropZones()
        }
      }
    }, { passive: true })

    card.addEventListener('touchend', (e) => {
      if (isDragging) {
        const touch = e.changedTouches[0]
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
        const dropZone = elementBelow?.closest('.album-grid')
        
        if (dropZone) {
          const albumId = card.dataset.albumId
          const targetWeekGroup = dropZone.dataset.weekGroup
          this.handleAlbumMove(albumId, targetWeekGroup)
        }
        
        card.classList.remove('dragging')
        this.hideDragFeedback()
        this.clearAllDropZones()
      }
      isDragging = false
    }, { passive: true })
  }

  /**
   * Show visual feedback during drag operations
   * @param {HTMLElement} card - Dragged card
   */
  showDragFeedback(card) {
    // Create drag preview
    const dragPreview = card.cloneNode(true)
    dragPreview.classList.add('drag-preview')
    dragPreview.style.position = 'fixed'
    dragPreview.style.top = '-1000px'
    dragPreview.style.left = '-1000px'
    dragPreview.style.zIndex = '1000'
    dragPreview.style.opacity = '0.8'
    dragPreview.style.transform = 'rotate(5deg)'
    dragPreview.style.pointerEvents = 'none'
    
    document.body.appendChild(dragPreview)
    
    // Update preview position during drag
    const updatePreview = (e) => {
      if (dragPreview && dragPreview.parentNode) {
        dragPreview.style.top = (e.clientY - 50) + 'px'
        dragPreview.style.left = (e.clientX - 50) + 'px'
      }
    }
    
    document.addEventListener('dragover', updatePreview)
    
    // Clean up on drag end
    const cleanup = () => {
      if (dragPreview && dragPreview.parentNode) {
        dragPreview.parentNode.removeChild(dragPreview)
      }
      document.removeEventListener('dragover', updatePreview)
      document.removeEventListener('dragend', cleanup)
    }
    
    document.addEventListener('dragend', cleanup)
  }

  /**
   * Hide drag feedback
   */
  hideDragFeedback() {
    const dragPreview = document.querySelector('.drag-preview')
    if (dragPreview && dragPreview.parentNode) {
      dragPreview.parentNode.removeChild(dragPreview)
    }
  }

  /**
   * Show drop zone indicator
   * @param {HTMLElement} grid - Drop zone grid
   */
  showDropZoneIndicator(grid) {
    if (!grid.querySelector('.drop-zone-indicator')) {
      const indicator = document.createElement('div')
      indicator.className = 'drop-zone-indicator'
      indicator.innerHTML = 'Drop album here'
      grid.appendChild(indicator)
    }
  }

  /**
   * Hide drop zone indicator
   * @param {HTMLElement} grid - Drop zone grid
   */
  hideDropZoneIndicator(grid) {
    const indicator = grid.querySelector('.drop-zone-indicator')
    if (indicator) {
      indicator.remove()
    }
  }

  /**
   * Show all drop zones
   */
  showAllDropZones() {
    const albumGrids = this.container.querySelectorAll('.album-grid')
    albumGrids.forEach(grid => {
      grid.classList.add('drop-zone-active')
      this.showDropZoneIndicator(grid)
    })
  }

  /**
   * Clear all drop zones
   */
  clearAllDropZones() {
    const albumGrids = this.container.querySelectorAll('.album-grid')
    albumGrids.forEach(grid => {
      grid.classList.remove('drag-over', 'drop-zone-active')
      this.hideDropZoneIndicator(grid)
    })
  }

  /**
   * Navigate to album detail page
   * @param {string} albumId - Album ID
   */
  navigateToAlbum(albumId) {
    if (window.app && window.app.navigate) {
      window.app.navigate(`/album/${albumId}`)
    }
  }

  /**
   * Show create album dialog
   * @param {string} weekGroup - Week group for new album
   */
  showCreateAlbumDialog(weekGroup = null) {
    const targetWeekGroup = weekGroup || getCurrentWeekGroup()
    
    const name = prompt('Enter album name:', 'New Album')
    if (name && name.trim()) {
      this.createAlbum(name.trim(), targetWeekGroup)
    }
  }

  /**
   * Show edit album dialog
   * @param {string} albumId - Album ID
   */
  showEditAlbumDialog(albumId) {
    const album = this.albums.find(a => a.id == albumId)
    if (!album) return

    const newName = prompt('Enter new album name:', album.name)
    if (newName && newName.trim() && newName.trim() !== album.name) {
      this.updateAlbum(albumId, newName.trim())
    }
  }

  /**
   * Show delete album confirmation
   * @param {string} albumId - Album ID
   */
  showDeleteAlbumDialog(albumId) {
    const album = this.albums.find(a => a.id == albumId)
    if (!album) return

    const confirmed = confirm(
      `Are you sure you want to delete "${album.name}"?\n\nThis will also delete all ${album.photoCount} photos in this album.`
    )
    
    if (confirmed) {
      this.deleteAlbum(albumId)
    }
  }

  /**
   * Create a new album
   * @param {string} name - Album name
   * @param {string} weekGroup - Week group
   */
  async createAlbum(name, weekGroup) {
    try {
      await albumService.createAlbum(name, weekGroup, 0)
      await this.loadAlbums()
    } catch (error) {
      console.error('Failed to create album:', error)
      alert('Failed to create album: ' + error.message)
    }
  }

  /**
   * Update an album
   * @param {string} albumId - Album ID
   * @param {string} name - New album name
   */
  async updateAlbum(albumId, name) {
    try {
      await albumService.updateAlbum(parseInt(albumId), { name })
      await this.loadAlbums()
    } catch (error) {
      console.error('Failed to update album:', error)
      alert('Failed to update album: ' + error.message)
    }
  }

  /**
   * Delete an album
   * @param {string} albumId - Album ID
   */
  async deleteAlbum(albumId) {
    try {
      await albumService.deleteAlbum(parseInt(albumId))
      await this.loadAlbums()
    } catch (error) {
      console.error('Failed to delete album:', error)
      alert('Failed to delete album: ' + error.message)
    }
  }

  /**
   * Handle album move between week groups
   * @param {string} albumId - Album ID
   * @param {string} targetWeekGroup - Target week group
   */
  async handleAlbumMove(albumId, targetWeekGroup) {
    try {
      const album = this.albums.find(a => a.id == albumId)
      if (!album) return

      if (album.weekGroup === targetWeekGroup) {
        return // Already in the same week group
      }

      await albumService.updateAlbum(parseInt(albumId), { 
        weekGroup: targetWeekGroup,
        sortOrder: 0
      })
      
      await this.loadAlbums()
    } catch (error) {
      console.error('Failed to move album:', error)
      alert('Failed to move album: ' + error.message)
    }
  }

  /**
   * Set loading state
   * @param {boolean} loading - Loading state
   */
  setLoading(loading) {
    this.isLoading = loading
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
