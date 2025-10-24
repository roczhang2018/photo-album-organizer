/**
 * Album Detail Component
 * Handles album detail view and photo management
 */
import { albumService } from '../services/AlbumService.js'
import { photoService } from '../services/PhotoService.js'
import { fileSystemService } from '../services/FileSystemService.js'
import { imageService } from '../services/ImageService.js'
import { PhotoUploader } from './PhotoUploader.js'
import { formatWeekGroup, getWeekGroupDisplayName } from '../utils/dateUtils.js'

export class AlbumDetail {
  constructor(container, albumId) {
    this.container = container
    this.albumId = parseInt(albumId)
    this.album = null
    this.photos = []
    this.isLoading = false
    this.isEditing = false
    this.selectedPhotos = []
    this.isSelectionMode = false
  }

  /**
   * Initialize the album detail view
   */
  async init() {
    this.render()
    await this.loadAlbumData()
  }

  /**
   * Load album and photo data
   */
  async loadAlbumData() {
    try {
      this.setLoading(true)
      
      // Load album data
      this.album = await albumService.getAlbumById(this.albumId)
      if (!this.album) {
        this.renderError('Album not found')
        return
      }

      // Load photos
      this.photos = await photoService.getPhotosInAlbum(this.albumId)
      
      this.render()
    } catch (error) {
      console.error('Failed to load album data:', error)
      this.renderError('Failed to load album data. Please try again.')
    } finally {
      this.setLoading(false)
    }
  }

  /**
   * Render the album detail view
   */
  render() {
    if (this.isLoading) {
      this.container.innerHTML = this.renderLoading()
      return
    }

    if (!this.album) {
      this.container.innerHTML = this.renderError('Album not found')
      return
    }

    this.container.innerHTML = this.renderAlbumDetail()
    this.attachEventListeners()
    this.setupLazyLoading()
  }

  /**
   * Render loading state
   */
  renderLoading() {
    return `
      <div class="album-detail-loading">
        <div class="loading-spinner"></div>
        <p>Loading album...</p>
      </div>
    `
  }

  /**
   * Render error state
   * @param {string} message - Error message
   */
  renderError(message) {
    return `
      <div class="album-detail-error">
        <div class="error-state">
          <h3>Error</h3>
          <p>${this.escapeHtml(message)}</p>
          <button class="retry-btn" data-action="retry-load">
            Retry
          </button>
          <button class="back-btn" data-action="go-back">
            Back to Albums
          </button>
        </div>
      </div>
    `
  }

  /**
   * Render album detail view
   */
  renderAlbumDetail() {
    return `
      <div class="album-detail">
        <header class="album-detail-header">
          <div class="album-header-content">
            <button class="back-button" data-action="go-back">← Back to Albums</button>
            <div class="album-info">
              <h1 class="album-title">${this.escapeHtml(this.album.name)}</h1>
              <p class="album-meta">
                ${getWeekGroupDisplayName(this.album.weekGroup)} • 
                ${this.photos.length} photos
              </p>
            </div>
            <div class="album-actions">
              <button class="action-btn" data-action="add-photos">
                📷 Add Photos
              </button>
              <button class="action-btn" data-action="select-photos">
                ☑️ Select
              </button>
              <button class="action-btn" data-action="edit-album">
                ✏️ Edit
              </button>
              <button class="action-btn" data-action="delete-album">
                🗑️ Delete
              </button>
            </div>
          </div>
        </header>
        
        <main class="album-detail-main">
          ${this.renderBulkActionsToolbar()}
          <div class="upload-section" id="upload-section" style="display: none;">
            <div class="upload-container" id="upload-container"></div>
          </div>
          ${this.renderPhotoGrid()}
        </main>
      </div>
    `
  }

  /**
   * Render bulk actions toolbar
   */
  renderBulkActionsToolbar() {
    if (!this.isSelectionMode) {
      return ''
    }

    const selectedCount = this.selectedPhotos.length
    const totalCount = this.photos.length

    return `
      <div class="bulk-actions-toolbar">
        <div class="bulk-actions-info">
          <span class="selected-count">${selectedCount} of ${totalCount} selected</span>
          <button class="clear-selection-btn" data-action="clear-selection">Clear Selection</button>
        </div>
        <div class="bulk-actions-buttons">
          <button class="bulk-action-btn" data-action="select-all" ${selectedCount === totalCount ? 'disabled' : ''}>
            Select All
          </button>
          <button class="bulk-action-btn" data-action="bulk-remove" ${selectedCount === 0 ? 'disabled' : ''}>
            Remove Selected
          </button>
          <button class="bulk-action-btn" data-action="bulk-move" ${selectedCount === 0 ? 'disabled' : ''}>
            Move Selected
          </button>
        </div>
      </div>
    `
  }

  /**
   * Render photo grid
   */
  renderPhotoGrid() {
    if (this.photos.length === 0) {
      return `
        <div class="photo-grid-empty">
          <div class="empty-state">
            <h3>No photos in this album</h3>
            <p>Add some photos to get started.</p>
            <button class="add-photos-btn" data-action="add-photos">
              Add Photos
            </button>
          </div>
        </div>
      `
    }

    return `
      <div class="photo-grid-container">
        <div class="photo-grid">
          ${this.photos.map(photo => this.renderPhotoCard(photo)).join('')}
        </div>
      </div>
    `
  }

  /**
   * Render photo card
   * @param {Object} photo - Photo data
   */
  renderPhotoCard(photo) {
    const isSelected = this.selectedPhotos && this.selectedPhotos.includes(photo.id)
    
    return `
      <div class="photo-card ${isSelected ? 'selected' : ''}" 
           data-photo-id="${photo.id}"
           role="button"
           tabindex="0"
           aria-label="Photo: ${this.escapeHtml(photo.filename)}. ${this.formatFileSize(photo.fileSize)}. Added: ${new Date(photo.addedDate).toLocaleDateString()}"
           aria-describedby="photo-${photo.id}-description">
        <div class="photo-selection">
          <input type="checkbox" 
                 class="photo-checkbox" 
                 data-photo-id="${photo.id}" 
                 ${isSelected ? 'checked' : ''}
                 aria-label="Select photo ${this.escapeHtml(photo.filename)}">
        </div>
        <div class="photo-thumbnail" data-photo-id="${photo.id}">
          <div class="photo-placeholder" data-photo-id="${photo.id}" aria-hidden="true">
            📷
          </div>
          <img class="photo-thumbnail-img" 
               data-lazy 
               data-photo-id="${photo.id}"
               alt="Thumbnail for ${this.escapeHtml(photo.filename)}"
               style="display: none;">
          <div class="photo-overlay">
            <button class="photo-action-btn" 
                    data-action="view-photo" 
                    data-photo-id="${photo.id}" 
                    title="View Photo"
                    aria-label="View photo ${this.escapeHtml(photo.filename)}">
              👁️
            </button>
            <button class="photo-action-btn" 
                    data-action="remove-photo" 
                    data-photo-id="${photo.id}" 
                    title="Remove Photo"
                    aria-label="Remove photo ${this.escapeHtml(photo.filename)}">
              🗑️
            </button>
          </div>
        </div>
        <div class="photo-info" id="photo-${photo.id}-description">
          <p class="photo-filename" title="${this.escapeHtml(photo.filename)}">${this.escapeHtml(photo.filename)}</p>
          <div class="photo-metadata">
            <span class="photo-size" aria-label="File size">${this.formatFileSize(photo.fileSize)}</span>
            <span class="photo-date" aria-label="Date added">${new Date(photo.addedDate).toLocaleDateString()}</span>
          </div>
          <div class="photo-actions-mini" role="group" aria-label="Photo actions">
            <button class="mini-action-btn" 
                    data-action="view-photo" 
                    data-photo-id="${photo.id}" 
                    title="View Photo"
                    aria-label="View photo ${this.escapeHtml(photo.filename)}">
              👁️
            </button>
            <button class="mini-action-btn" 
                    data-action="move-photo" 
                    data-photo-id="${photo.id}" 
                    title="Move Photo"
                    aria-label="Move photo ${this.escapeHtml(photo.filename)}">
              📁
            </button>
            <button class="mini-action-btn" 
                    data-action="remove-photo" 
                    data-photo-id="${photo.id}" 
                    title="Remove Photo"
                    aria-label="Remove photo ${this.escapeHtml(photo.filename)}">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Setup lazy loading for photo thumbnails
   */
  setupLazyLoading() {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      this.loadAllThumbnails()
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadThumbnail(entry.target)
          observer.unobserve(entry.target)
        }
      })
    }, {
      rootMargin: '50px 0px',
      threshold: 0.1
    })

    const lazyImages = this.container.querySelectorAll('.photo-thumbnail-img[data-lazy]')
    lazyImages.forEach(img => {
      observer.observe(img)
    })
  }

  /**
   * Load thumbnail for a specific photo
   * @param {HTMLImageElement} img - Image element
   */
  async loadThumbnail(img) {
    const photoId = img.dataset.photoId
    const photo = this.photos.find(p => p.id == photoId)
    
    if (!photo) {
      return
    }

    try {
      // Add loading class
      img.classList.add('loading')
      
      // For now, we'll use a placeholder since we don't have actual image files
      // In a real implementation, you would load the actual image file
      const placeholder = await this.generatePlaceholderThumbnail(photo)
      
      img.src = placeholder
      img.style.display = 'block'
      img.classList.remove('loading')
      
      // Hide placeholder
      const placeholderDiv = img.parentElement.querySelector('.photo-placeholder')
      if (placeholderDiv) {
        placeholderDiv.style.display = 'none'
      }
    } catch (error) {
      console.error('Failed to load thumbnail:', error)
      img.classList.add('error')
      img.classList.remove('loading')
    }
  }

  /**
   * Generate a placeholder thumbnail
   * @param {Object} photo - Photo data
   * @returns {Promise<string>} Placeholder data URL
   */
  async generatePlaceholderThumbnail(photo) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    canvas.width = 200
    canvas.height = 200
    
    // Background
    ctx.fillStyle = 'rgba(100, 108, 255, 0.1)'
    ctx.fillRect(0, 0, 200, 200)
    
    // Border
    ctx.strokeStyle = 'rgba(100, 108, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, 198, 198)
    
    // Icon
    ctx.fillStyle = 'rgba(100, 108, 255, 0.6)'
    ctx.font = '48px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('📷', 100, 100)
    
    // Filename
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '12px Arial'
    const filename = photo.filename.length > 20 ? photo.filename.substring(0, 17) + '...' : photo.filename
    ctx.fillText(filename, 100, 160)
    
    return canvas.toDataURL('image/png')
  }

  /**
   * Load all thumbnails (fallback for browsers without IntersectionObserver)
   */
  async loadAllThumbnails() {
    const lazyImages = this.container.querySelectorAll('.photo-thumbnail-img[data-lazy]')
    for (const img of lazyImages) {
      await this.loadThumbnail(img)
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Action buttons
    this.container.addEventListener('click', (e) => {
      const action = e.target.dataset.action
      const photoId = e.target.dataset.photoId

      switch (action) {
        case 'go-back':
          this.goBack()
          break
        case 'add-photos':
          this.showPhotoUploader()
          break
        case 'select-photos':
          this.toggleSelectionMode()
          break
        case 'edit-album':
          this.showEditAlbumDialog()
          break
        case 'delete-album':
          this.showDeleteAlbumDialog()
          break
        case 'view-photo':
          this.viewPhoto(photoId)
          break
        case 'remove-photo':
          this.showRemovePhotoDialog(photoId)
          break
        case 'retry-load':
          this.loadAlbumData()
          break
        case 'clear-selection':
          this.clearSelection()
          break
        case 'select-all':
          this.selectAllPhotos()
          break
        case 'bulk-remove':
          this.showBulkRemoveDialog()
          break
        case 'bulk-move':
          this.showBulkMoveDialog()
          break
        case 'move-photo':
          this.showMovePhotoDialog(photoId)
          break
      }
    })

    // Photo card clicks
    this.container.addEventListener('click', (e) => {
      const photoCard = e.target.closest('.photo-card')
      if (photoCard && !e.target.closest('.photo-overlay')) {
        const photoId = photoCard.dataset.photoId
        
        if (this.isSelectionMode) {
          this.togglePhotoSelection(photoId)
        } else {
          this.viewPhoto(photoId)
        }
      }
    })

    // Photo checkbox changes
    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('photo-checkbox')) {
        const photoId = parseInt(e.target.dataset.photoId)
        this.togglePhotoSelection(photoId)
      }
    })

    // Keyboard navigation for photo cards
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const photoCard = e.target.closest('.photo-card')
        if (photoCard) {
          e.preventDefault()
          const photoId = photoCard.dataset.photoId
          
          if (this.isSelectionMode) {
            this.togglePhotoSelection(photoId)
          } else {
            this.viewPhoto(photoId)
          }
        }
      }
    })
  }

  /**
   * Navigate back to album list
   */
  goBack() {
    if (window.app && window.app.navigate) {
      window.app.navigate('/')
    }
  }

  /**
   * Show photo uploader
   */
  async showPhotoUploader() {
    const uploadSection = this.container.querySelector('#upload-section')
    const uploadContainer = this.container.querySelector('#upload-container')
    
    if (uploadSection.style.display === 'none') {
      // Show uploader
      uploadSection.style.display = 'block'
      
      // Initialize photo uploader
      this.photoUploader = new PhotoUploader(uploadContainer, this.albumId)
      await this.photoUploader.init()
      
      // Scroll to uploader
      uploadSection.scrollIntoView({ behavior: 'smooth' })
    } else {
      // Hide uploader
      uploadSection.style.display = 'none'
    }
  }

  /**
   * Show add photos dialog (legacy method)
   */
  async showAddPhotosDialog() {
    try {
      const selectedFiles = await fileSystemService.selectPhotos({
        multiple: true
      })

      if (selectedFiles.length === 0) {
        return
      }

      // Show import progress
      this.showImportProgress(selectedFiles.length)

      // Add photos to album with progress updates
      const result = await this.addPhotosWithProgress(selectedFiles)
      
      // Hide progress
      this.hideImportProgress()

      // Show results
      this.showImportResults(result)
      
      if (result.successCount > 0) {
        await this.loadAlbumData()
      }
    } catch (error) {
      console.error('Failed to add photos:', error)
      this.hideImportProgress()
      this.showImportError(error.message)
    }
  }

  /**
   * Add photos with progress updates
   * @param {Array} selectedFiles - Selected files
   * @returns {Promise<Object>} Import result
   */
  async addPhotosWithProgress(selectedFiles) {
    const addedPhotos = []
    const errors = []
    const total = selectedFiles.length

    for (let i = 0; i < selectedFiles.length; i++) {
      const fileInfo = selectedFiles[i]
      
      try {
        // Update progress
        this.updateImportProgress(i + 1, total, fileInfo.name)

        const photoData = {
          filename: fileInfo.name,
          filePath: fileInfo.path,
          fileSize: fileInfo.size
        }

        const photo = await photoService.addPhotoToAlbum(this.albumId, photoData)
        addedPhotos.push(photo)
      } catch (error) {
        console.error(`Failed to add photo ${fileInfo.name}:`, error)
        errors.push({
          filename: fileInfo.name,
          error: error.message
        })
      }
    }

    return {
      added: addedPhotos,
      errors: errors,
      successCount: addedPhotos.length,
      errorCount: errors.length
    }
  }

  /**
   * Show import progress dialog
   * @param {number} total - Total number of files
   */
  showImportProgress(total) {
    const progressHTML = `
      <div class="import-progress-overlay">
        <div class="import-progress-dialog">
          <h3>Importing Photos</h3>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <p class="progress-text">Preparing to import ${total} photos...</p>
          <p class="current-file"></p>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', progressHTML)
  }

  /**
   * Update import progress
   * @param {number} current - Current file number
   * @param {number} total - Total files
   * @param {string} filename - Current filename
   */
  updateImportProgress(current, total, filename) {
    const progressFill = document.querySelector('.progress-fill')
    const progressText = document.querySelector('.progress-text')
    const currentFile = document.querySelector('.current-file')
    
    if (progressFill) {
      const percentage = (current / total) * 100
      progressFill.style.width = `${percentage}%`
    }
    
    if (progressText) {
      progressText.textContent = `Importing ${current} of ${total} photos...`
    }
    
    if (currentFile) {
      currentFile.textContent = `Current: ${filename}`
    }
  }

  /**
   * Hide import progress
   */
  hideImportProgress() {
    const overlay = document.querySelector('.import-progress-overlay')
    if (overlay) {
      overlay.remove()
    }
  }

  /**
   * Show import results
   * @param {Object} result - Import result
   */
  showImportResults(result) {
    const { successCount, errorCount } = result
    
    if (errorCount === 0) {
      this.showNotification(`Successfully imported ${successCount} photos!`, 'success')
    } else if (successCount === 0) {
      this.showNotification(`Failed to import all ${errorCount} photos.`, 'error')
    } else {
      this.showNotification(
        `Imported ${successCount} photos successfully. ${errorCount} photos failed.`, 
        'warning'
      )
    }
  }

  /**
   * Show import error
   * @param {string} message - Error message
   */
  showImportError(message) {
    this.showNotification(`Import failed: ${message}`, 'error')
  }

  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, warning)
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.textContent = message
    
    // Add to page
    document.body.appendChild(notification)
    
    // Show with animation
    setTimeout(() => {
      notification.classList.add('show')
    }, 100)
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show')
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 5000)
  }

  /**
   * Show edit album dialog
   */
  showEditAlbumDialog() {
    const newName = prompt('Enter new album name:', this.album.name)
    if (newName && newName.trim() && newName.trim() !== this.album.name) {
      this.updateAlbum(newName.trim())
    }
  }

  /**
   * Show delete album dialog
   */
  showDeleteAlbumDialog() {
    const confirmed = confirm(
      `Are you sure you want to delete "${this.album.name}"?\n\nThis will also delete all ${this.photos.length} photos in this album.`
    )
    
    if (confirmed) {
      this.deleteAlbum()
    }
  }

  /**
   * View photo (placeholder for future implementation)
   * @param {string} photoId - Photo ID
   */
  viewPhoto(photoId) {
    console.log('View photo:', photoId)
    // TODO: Implement photo viewer modal
    alert('Photo viewer not yet implemented')
  }

  /**
   * Show remove photo dialog
   * @param {string} photoId - Photo ID
   */
  showRemovePhotoDialog(photoId) {
    const photo = this.photos.find(p => p.id == photoId)
    if (!photo) return

    const confirmed = confirm(`Remove "${photo.filename}" from this album?`)
    if (confirmed) {
      this.removePhoto(photoId)
    }
  }

  /**
   * Show move photo dialog
   * @param {string} photoId - Photo ID
   */
  async showMovePhotoDialog(photoId) {
    const photo = this.photos.find(p => p.id == photoId)
    if (!photo) return

    try {
      const albums = await albumService.getAlbums()
      const availableAlbums = albums.filter(album => album.id !== this.albumId)
      
      if (availableAlbums.length === 0) {
        alert('No other albums available to move this photo to.')
        return
      }

      const albumNames = availableAlbums.map(album => album.name).join('\n')
      const selectedAlbumName = prompt(
        `Move "${photo.filename}" to which album?\n\n${albumNames}\n\nEnter album name:`
      )

      if (!selectedAlbumName) {
        return
      }

      const targetAlbum = availableAlbums.find(album => 
        album.name.toLowerCase() === selectedAlbumName.toLowerCase()
      )

      if (!targetAlbum) {
        alert('Album not found. Please check the name and try again.')
        return
      }

      const confirmed = confirm(
        `Move "${photo.filename}" to "${targetAlbum.name}"?`
      )

      if (confirmed) {
        await this.movePhoto(photoId, targetAlbum.id)
      }
    } catch (error) {
      console.error('Failed to show move photo dialog:', error)
      alert('Failed to load albums for move operation.')
    }
  }

  /**
   * Update album name
   * @param {string} name - New album name
   */
  async updateAlbum(name) {
    try {
      await albumService.updateAlbum(this.albumId, { name })
      await this.loadAlbumData()
    } catch (error) {
      console.error('Failed to update album:', error)
      alert('Failed to update album: ' + error.message)
    }
  }

  /**
   * Delete album
   */
  async deleteAlbum() {
    try {
      await albumService.deleteAlbum(this.albumId)
      this.goBack()
    } catch (error) {
      console.error('Failed to delete album:', error)
      alert('Failed to delete album: ' + error.message)
    }
  }

  /**
   * Remove photo from album
   * @param {string} photoId - Photo ID
   */
  async removePhoto(photoId) {
    try {
      await photoService.removePhotoFromAlbum(parseInt(photoId))
      await this.loadAlbumData()
      this.showNotification('Photo removed from album', 'success')
    } catch (error) {
      console.error('Failed to remove photo:', error)
      this.showNotification('Failed to remove photo: ' + error.message, 'error')
    }
  }

  /**
   * Move photo to another album
   * @param {string} photoId - Photo ID
   * @param {number} targetAlbumId - Target album ID
   */
  async movePhoto(photoId, targetAlbumId) {
    try {
      // Get photo data
      const photo = await photoService.getPhotoById(parseInt(photoId))
      if (!photo) {
        this.showNotification('Photo not found', 'error')
        return
      }

      // Add to target album
      await photoService.addPhotoToAlbum(targetAlbumId, {
        filename: photo.filename,
        filePath: photo.file_path,
        fileSize: photo.file_size
      })

      // Remove from current album
      await photoService.removePhotoFromAlbum(parseInt(photoId))
      
      await this.loadAlbumData()
      this.showNotification(`Photo moved successfully`, 'success')
    } catch (error) {
      console.error('Failed to move photo:', error)
      this.showNotification('Failed to move photo: ' + error.message, 'error')
    }
  }

  /**
   * Toggle selection mode
   */
  toggleSelectionMode() {
    this.isSelectionMode = !this.isSelectionMode
    if (!this.isSelectionMode) {
      this.selectedPhotos = []
    }
    this.render()
  }

  /**
   * Toggle photo selection
   * @param {string|number} photoId - Photo ID
   */
  togglePhotoSelection(photoId) {
    const id = parseInt(photoId)
    const index = this.selectedPhotos.indexOf(id)
    
    if (index > -1) {
      this.selectedPhotos.splice(index, 1)
    } else {
      this.selectedPhotos.push(id)
    }
    
    this.render()
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    this.selectedPhotos = []
    this.render()
  }

  /**
   * Select all photos
   */
  selectAllPhotos() {
    this.selectedPhotos = this.photos.map(photo => photo.id)
    this.render()
  }

  /**
   * Show bulk remove dialog
   */
  showBulkRemoveDialog() {
    const count = this.selectedPhotos.length
    const confirmed = confirm(`Remove ${count} selected photos from this album?`)
    
    if (confirmed) {
      this.bulkRemovePhotos()
    }
  }

  /**
   * Show bulk move dialog
   */
  async showBulkMoveDialog() {
    try {
      const albums = await albumService.getAlbums()
      const availableAlbums = albums.filter(album => album.id !== this.albumId)
      
      if (availableAlbums.length === 0) {
        alert('No other albums available to move photos to.')
        return
      }

      const albumNames = availableAlbums.map(album => album.name).join('\n')
      const selectedAlbumName = prompt(
        `Select album to move ${this.selectedPhotos.length} photos to:\n\n${albumNames}\n\nEnter album name:`
      )

      if (!selectedAlbumName) {
        return
      }

      const targetAlbum = availableAlbums.find(album => 
        album.name.toLowerCase() === selectedAlbumName.toLowerCase()
      )

      if (!targetAlbum) {
        alert('Album not found. Please check the name and try again.')
        return
      }

      const confirmed = confirm(
        `Move ${this.selectedPhotos.length} photos to "${targetAlbum.name}"?`
      )

      if (confirmed) {
        await this.bulkMovePhotos(targetAlbum.id)
      }
    } catch (error) {
      console.error('Failed to show bulk move dialog:', error)
      alert('Failed to load albums for move operation.')
    }
  }

  /**
   * Bulk remove selected photos
   */
  async bulkRemovePhotos() {
    try {
      for (const photoId of this.selectedPhotos) {
        await photoService.removePhotoFromAlbum(photoId)
      }
      
      this.selectedPhotos = []
      await this.loadAlbumData()
      this.showNotification(`Removed ${this.selectedPhotos.length} photos from album`, 'success')
    } catch (error) {
      console.error('Failed to remove photos:', error)
      this.showNotification('Failed to remove some photos. Please try again.', 'error')
    }
  }

  /**
   * Bulk move selected photos to another album
   * @param {number} targetAlbumId - Target album ID
   */
  async bulkMovePhotos(targetAlbumId) {
    try {
      let movedCount = 0
      let errorCount = 0

      for (const photoId of this.selectedPhotos) {
        try {
          // Get photo data
          const photo = await photoService.getPhotoById(photoId)
          if (!photo) {
            errorCount++
            continue
          }

          // Add to target album
          await photoService.addPhotoToAlbum(targetAlbumId, {
            filename: photo.filename,
            filePath: photo.file_path,
            fileSize: photo.file_size
          })

          // Remove from current album
          await photoService.removePhotoFromAlbum(photoId)
          movedCount++
        } catch (error) {
          console.error(`Failed to move photo ${photoId}:`, error)
          errorCount++
        }
      }

      this.selectedPhotos = []
      await this.loadAlbumData()

      if (errorCount === 0) {
        this.showNotification(`Successfully moved ${movedCount} photos`, 'success')
      } else {
        this.showNotification(
          `Moved ${movedCount} photos. ${errorCount} photos failed to move.`, 
          'warning'
        )
      }
    } catch (error) {
      console.error('Failed to move photos:', error)
      this.showNotification('Failed to move photos. Please try again.', 'error')
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
