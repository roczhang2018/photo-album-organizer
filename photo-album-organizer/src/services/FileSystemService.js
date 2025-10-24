/**
 * File System Service
 * Handles file system access and file operations
 */
import { photoService } from './PhotoService.js'

export class FileSystemService {
  constructor() {
    this.supportedImageTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'image/svg+xml'
    ]
    
    this.maxFileSize = 50 * 1024 * 1024 // 50MB
    this.isFileSystemAccessSupported = 'showOpenFilePicker' in window
  }

  /**
   * Check if File System Access API is supported
   * @returns {boolean} True if supported
   */
  isSupported() {
    return this.isFileSystemAccessSupported
  }

  /**
   * Select photos using File System Access API or fallback
   * @param {Object} options - Selection options
   * @returns {Promise<Array>} Array of selected files
   */
  async selectPhotos(options = {}) {
    const {
      multiple = true,
      accept = this.supportedImageTypes,
      excludeAcceptAllOption = true
    } = options

    if (this.isFileSystemAccessSupported) {
      return await this.selectPhotosWithFileSystemAPI({
        multiple,
        types: [{
          description: 'Image files',
          accept: accept.reduce((acc, type) => {
            acc[type] = [`.${type.split('/')[1]}`]
            return acc
          }, {})
        }],
        excludeAcceptAllOption
      })
    } else {
      return await this.selectPhotosWithFileInput({
        multiple,
        accept: accept.join(',')
      })
    }
  }

  /**
   * Select photos using File System Access API
   * @param {Object} options - Selection options
   * @returns {Promise<Array>} Array of selected files
   */
  async selectPhotosWithFileSystemAPI(options) {
    try {
      const fileHandles = await window.showOpenFilePicker(options)
      const files = []
      
      for (const fileHandle of fileHandles) {
        const file = await fileHandle.getFile()
        if (this.validateFile(file)) {
          files.push({
            file,
            fileHandle,
            name: file.name,
            path: fileHandle.name, // File System Access API doesn't provide full path
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          })
        }
      }
      
      return files
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('File selection cancelled by user')
        return []
      }
      console.error('Failed to select files with File System Access API:', error)
      throw new Error('Failed to select files: ' + error.message)
    }
  }

  /**
   * Select photos using traditional file input (fallback)
   * @param {Object} options - Selection options
   * @returns {Promise<Array>} Array of selected files
   */
  async selectPhotosWithFileInput(options) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = options.multiple
      input.accept = options.accept
      input.style.display = 'none'
      
      input.onchange = (event) => {
        const files = Array.from(event.target.files)
        const validFiles = []
        
        for (const file of files) {
          if (this.validateFile(file)) {
            validFiles.push({
              file,
              fileHandle: null, // Not available in fallback
              name: file.name,
              path: file.name, // Fallback only has filename
              size: file.size,
              type: file.type,
              lastModified: file.lastModified
            })
          }
        }
        
        document.body.removeChild(input)
        resolve(validFiles)
      }
      
      input.oncancel = () => {
        document.body.removeChild(input)
        resolve([])
      }
      
      input.onerror = (error) => {
        document.body.removeChild(input)
        reject(new Error('File selection failed: ' + error.message))
      }
      
      document.body.appendChild(input)
      input.click()
    })
  }

  /**
   * Validate a file
   * @param {File} file - File to validate
   * @returns {boolean} True if valid
   */
  validateFile(file) {
    if (!file) {
      return false
    }

    // Check file type
    if (!this.supportedImageTypes.includes(file.type)) {
      console.warn(`Unsupported file type: ${file.type}`)
      return false
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      console.warn(`File too large: ${file.size} bytes (max: ${this.maxFileSize})`)
      return false
    }

    // Check if file is empty
    if (file.size === 0) {
      console.warn('File is empty')
      return false
    }

    return true
  }

  /**
   * Read file as data URL
   * @param {File} file - File to read
   * @returns {Promise<string>} Data URL
   */
  async readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        resolve(event.target.result)
      }
      
      reader.onerror = (error) => {
        reject(new Error('Failed to read file: ' + error.message))
      }
      
      reader.readAsDataURL(file)
    })
  }

  /**
   * Read file as ArrayBuffer
   * @param {File} file - File to read
   * @returns {Promise<ArrayBuffer>} ArrayBuffer
   */
  async readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        resolve(event.target.result)
      }
      
      reader.onerror = (error) => {
        reject(new Error('Failed to read file: ' + error.message))
      }
      
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Get file information
   * @param {File} file - File to analyze
   * @returns {Object} File information
   */
  getFileInfo(file) {
    if (!file) {
      return null
    }

    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      extension: this.getFileExtension(file.name),
      isImage: this.supportedImageTypes.includes(file.type),
      formattedSize: this.formatFileSize(file.size)
    }
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Filename
   * @returns {string} File extension (lowercase)
   */
  getFileExtension(filename) {
    if (!filename || typeof filename !== 'string') {
      return ''
    }
    
    const lastDot = filename.lastIndexOf('.')
    if (lastDot === -1 || lastDot === filename.length - 1) {
      return ''
    }
    
    return filename.substring(lastDot + 1).toLowerCase()
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
   * Add selected photos to album
   * @param {number} albumId - Album ID
   * @param {Array} selectedFiles - Array of selected files
   * @returns {Promise<Array>} Array of added photos
   */
  async addPhotosToAlbum(albumId, selectedFiles) {
    if (!albumId || !selectedFiles || !Array.isArray(selectedFiles)) {
      throw new Error('Album ID and selected files are required')
    }

    const addedPhotos = []
    const errors = []

    for (const fileInfo of selectedFiles) {
      try {
        const photoData = {
          filename: fileInfo.name,
          filePath: fileInfo.path,
          fileSize: fileInfo.size
        }

        const photo = await photoService.addPhotoToAlbum(albumId, photoData)
        addedPhotos.push(photo)
      } catch (error) {
        console.error(`Failed to add photo ${fileInfo.name}:`, error)
        errors.push({
          filename: fileInfo.name,
          error: error.message
        })
      }
    }

    if (errors.length > 0) {
      console.warn('Some photos could not be added:', errors)
    }

    return {
      added: addedPhotos,
      errors: errors,
      successCount: addedPhotos.length,
      errorCount: errors.length
    }
  }

  /**
   * Create a file input element for manual file selection
   * @param {Object} options - Input options
   * @returns {HTMLElement} File input element
   */
  createFileInput(options = {}) {
    const {
      multiple = true,
      accept = this.supportedImageTypes.join(','),
      className = 'file-input'
    } = options

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = multiple
    input.accept = accept
    input.className = className
    input.style.display = 'none'

    return input
  }

  /**
   * Get supported image types
   * @returns {Array<string>} Array of supported MIME types
   */
  getSupportedImageTypes() {
    return [...this.supportedImageTypes]
  }

  /**
   * Get maximum file size
   * @returns {number} Maximum file size in bytes
   */
  getMaxFileSize() {
    return this.maxFileSize
  }

  /**
   * Set maximum file size
   * @param {number} size - Maximum file size in bytes
   */
  setMaxFileSize(size) {
    if (typeof size !== 'number' || size <= 0) {
      throw new Error('Maximum file size must be a positive number')
    }
    this.maxFileSize = size
  }
}

// Create singleton instance
export const fileSystemService = new FileSystemService()
