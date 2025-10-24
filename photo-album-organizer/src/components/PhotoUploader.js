/**
 * Photo Uploader Component
 * Handles photo upload with drag-and-drop, preview, and progress
 */
import { photoService } from '../services/PhotoService.js'

export class PhotoUploader {
  constructor(container, albumId) {
    this.container = container
    this.albumId = albumId
    this.supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    this.maxFileSize = 10 * 1024 * 1024 // 10MB
    this.isUploading = false
    this.uploadQueue = []
  }

  /**
   * Initialize the photo uploader
   */
  async init() {
    this.render()
    this.attachEventListeners()
  }

  /**
   * Render the photo uploader
   */
  render() {
    this.container.innerHTML = `
      <div class="photo-uploader">
        <div class="upload-area" id="upload-area">
          <div class="upload-content">
            <div class="upload-icon">📸</div>
            <h3>Upload Photos</h3>
            <p>Drag and drop images here, or click to select files</p>
            <div class="upload-info">
              <small>Supported formats: JPEG, PNG, GIF, WebP</small>
              <small>Max file size: 10MB</small>
            </div>
            <input type="file" id="file-input" multiple accept="image/*" style="display: none;">
            <button class="select-files-btn" id="select-files-btn">Select Files</button>
          </div>
        </div>
        
        <div class="upload-progress" id="upload-progress" style="display: none;">
          <div class="progress-header">
            <h4>Uploading Photos...</h4>
            <span class="progress-text" id="progress-text">0 / 0</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
          <div class="upload-queue" id="upload-queue"></div>
        </div>
        
        <div class="upload-results" id="upload-results" style="display: none;">
          <div class="results-header">
            <h4>Upload Complete</h4>
            <button class="close-results-btn" id="close-results-btn">×</button>
          </div>
          <div class="results-content" id="results-content"></div>
        </div>
      </div>
    `
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const uploadArea = this.container.querySelector('#upload-area')
    const fileInput = this.container.querySelector('#file-input')
    const selectBtn = this.container.querySelector('#select-files-btn')
    const closeResultsBtn = this.container.querySelector('#close-results-btn')

    // Click to select files
    selectBtn.addEventListener('click', () => {
      fileInput.click()
    })

    uploadArea.addEventListener('click', (e) => {
      if (e.target === uploadArea || e.target.closest('.upload-content')) {
        fileInput.click()
      }
    })

    // File input change
    fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files)
    })

    // Drag and drop events
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault()
      uploadArea.classList.add('drag-over')
    })

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault()
      uploadArea.classList.remove('drag-over')
    })

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault()
      uploadArea.classList.remove('drag-over')
      this.handleFiles(e.dataTransfer.files)
    })

    // Close results
    closeResultsBtn.addEventListener('click', () => {
      this.hideResults()
    })
  }

  /**
   * Handle selected files
   * @param {FileList} files - Selected files
   */
  async handleFiles(files) {
    if (this.isUploading) {
      console.log('Upload already in progress')
      return
    }

    const validFiles = this.validateFiles(Array.from(files))
    
    if (validFiles.length === 0) {
      this.showError('No valid image files selected')
      return
    }

    if (validFiles.length !== files.length) {
      this.showError(`${files.length - validFiles.length} files were skipped (invalid format or too large)`)
    }

    await this.uploadFiles(validFiles)
  }

  /**
   * Validate files
   * @param {Array} files - Files to validate
   * @returns {Array} Valid files
   */
  validateFiles(files) {
    return files.filter(file => {
      // Check file type
      if (!this.supportedTypes.includes(file.type)) {
        console.warn(`Unsupported file type: ${file.type}`)
        return false
      }

      // Check file size
      if (file.size > this.maxFileSize) {
        console.warn(`File too large: ${file.name} (${file.size} bytes)`)
        return false
      }

      return true
    })
  }

  /**
   * Upload files with progress
   * @param {Array} files - Files to upload
   */
  async uploadFiles(files) {
    this.isUploading = true
    this.uploadQueue = files.map(file => ({
      file,
      status: 'pending',
      progress: 0
    }))

    this.showProgress()
    this.updateQueueDisplay()

    const results = {
      success: [],
      errors: []
    }

    for (let i = 0; i < this.uploadQueue.length; i++) {
      const item = this.uploadQueue[i]
      
      try {
        // Update status
        item.status = 'uploading'
        this.updateQueueDisplay()

        // Create file data URL for preview
        const dataUrl = await this.createFileDataUrl(item.file)
        
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          item.progress = progress
          this.updateProgress(i + 1, this.uploadQueue.length)
          this.updateQueueDisplay()
          await new Promise(resolve => setTimeout(resolve, 50))
        }

        // Add photo to album (using mock data for now)
        const photoData = {
          filename: item.file.name,
          filePath: dataUrl, // Using data URL as file path
          fileSize: item.file.size
        }

        const photo = await photoService.addPhotoToAlbum(this.albumId, photoData)
        
        item.status = 'success'
        results.success.push({
          file: item.file,
          photo,
          dataUrl
        })

      } catch (error) {
        console.error(`Failed to upload ${item.file.name}:`, error)
        item.status = 'error'
        results.errors.push({
          file: item.file,
          error: error.message
        })
      }

      this.updateQueueDisplay()
    }

    this.isUploading = false
    this.hideProgress()
    this.showResults(results)
  }

  /**
   * Create data URL from file
   * @param {File} file - File to convert
   * @returns {Promise<string>} Data URL
   */
  createFileDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /**
   * Show upload progress
   */
  showProgress() {
    const progressDiv = this.container.querySelector('#upload-progress')
    progressDiv.style.display = 'block'
  }

  /**
   * Hide upload progress
   */
  hideProgress() {
    const progressDiv = this.container.querySelector('#upload-progress')
    progressDiv.style.display = 'none'
  }

  /**
   * Update progress
   * @param {number} current - Current file number
   * @param {number} total - Total files
   */
  updateProgress(current, total) {
    const progressText = this.container.querySelector('#progress-text')
    const progressFill = this.container.querySelector('#progress-fill')
    
    const percentage = (current / total) * 100
    
    progressText.textContent = `${current} / ${total}`
    progressFill.style.width = `${percentage}%`
  }

  /**
   * Update queue display
   */
  updateQueueDisplay() {
    const queueDiv = this.container.querySelector('#upload-queue')
    
    queueDiv.innerHTML = this.uploadQueue.map(item => {
      const statusIcon = {
        pending: '⏳',
        uploading: '📤',
        success: '✅',
        error: '❌'
      }[item.status]

      return `
        <div class="queue-item ${item.status}">
          <span class="status-icon">${statusIcon}</span>
          <span class="file-name">${item.file.name}</span>
          <span class="file-size">${this.formatFileSize(item.file.size)}</span>
          ${item.status === 'uploading' ? `<div class="item-progress"><div class="item-progress-fill" style="width: ${item.progress}%"></div></div>` : ''}
        </div>
      `
    }).join('')
  }

  /**
   * Show upload results
   * @param {Object} results - Upload results
   */
  showResults(results) {
    const resultsDiv = this.container.querySelector('#upload-results')
    const contentDiv = this.container.querySelector('#results-content')
    
    let html = ''
    
    if (results.success.length > 0) {
      html += `
        <div class="success-section">
          <h5>✅ Successfully uploaded (${results.success.length})</h5>
          <div class="success-photos">
            ${results.success.map(item => `
              <div class="success-photo">
                <img src="${item.dataUrl}" alt="${item.file.name}" class="preview-thumb">
                <span class="photo-name">${item.file.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `
    }
    
    if (results.errors.length > 0) {
      html += `
        <div class="error-section">
          <h5>❌ Failed to upload (${results.errors.length})</h5>
          <div class="error-list">
            ${results.errors.map(item => `
              <div class="error-item">
                <span class="error-file">${item.file.name}</span>
                <span class="error-message">${item.error}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `
    }
    
    contentDiv.innerHTML = html
    resultsDiv.style.display = 'block'
  }

  /**
   * Hide results
   */
  hideResults() {
    const resultsDiv = this.container.querySelector('#upload-results')
    resultsDiv.style.display = 'none'
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    // Simple error display - could be enhanced with a proper modal
    alert(`Error: ${message}`)
  }

  /**
   * Format file size
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
