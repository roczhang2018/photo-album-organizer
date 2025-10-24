/**
 * Image Service
 * Handles image processing, thumbnail generation, and optimization
 */
export class ImageService {
  constructor() {
    this.thumbnailCache = new Map()
    this.maxThumbnailSize = 200
    this.quality = 0.8
    this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
  }

  /**
   * Generate thumbnail from image file
   * @param {File|string} imageSource - Image file or data URL
   * @param {Object} options - Thumbnail options
   * @returns {Promise<string>} Thumbnail data URL
   */
  async generateThumbnail(imageSource, options = {}) {
    const {
      maxSize = this.maxThumbnailSize,
      quality = this.quality,
      format = 'image/jpeg'
    } = options

    try {
      // Create cache key
      const cacheKey = this.createCacheKey(imageSource, maxSize, quality, format)
      
      // Check cache first
      if (this.thumbnailCache.has(cacheKey)) {
        return this.thumbnailCache.get(cacheKey)
      }

      // Load image
      const image = await this.loadImage(imageSource)
      
      // Calculate thumbnail dimensions
      const dimensions = this.calculateThumbnailDimensions(
        image.width,
        image.height,
        maxSize
      )

      // Generate thumbnail
      const thumbnailDataURL = await this.createThumbnail(
        image,
        dimensions.width,
        dimensions.height,
        quality,
        format
      )

      // Cache the result
      this.thumbnailCache.set(cacheKey, thumbnailDataURL)

      return thumbnailDataURL
    } catch (error) {
      console.error('Failed to generate thumbnail:', error)
      throw new Error(`Thumbnail generation failed: ${error.message}`)
    }
  }

  /**
   * Load image from various sources
   * @param {File|string} source - Image source
   * @returns {Promise<HTMLImageElement>} Loaded image
   */
  async loadImage(source) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => resolve(img)
      img.onerror = (error) => reject(new Error('Failed to load image: ' + error.message))
      
      if (source instanceof File) {
        const reader = new FileReader()
        reader.onload = (e) => {
          img.src = e.target.result
        }
        reader.onerror = (error) => reject(new Error('Failed to read file: ' + error.message))
        reader.readAsDataURL(source)
      } else if (typeof source === 'string') {
        img.src = source
      } else {
        reject(new Error('Invalid image source'))
      }
    })
  }

  /**
   * Calculate thumbnail dimensions maintaining aspect ratio
   * @param {number} originalWidth - Original image width
   * @param {number} originalHeight - Original image height
   * @param {number} maxSize - Maximum size for thumbnail
   * @returns {Object} Thumbnail dimensions
   */
  calculateThumbnailDimensions(originalWidth, originalHeight, maxSize) {
    if (originalWidth <= maxSize && originalHeight <= maxSize) {
      return { width: originalWidth, height: originalHeight }
    }

    const aspectRatio = originalWidth / originalHeight
    
    let width, height
    if (aspectRatio > 1) {
      // Landscape
      width = maxSize
      height = Math.round(maxSize / aspectRatio)
    } else {
      // Portrait or square
      height = maxSize
      width = Math.round(maxSize * aspectRatio)
    }

    return { width, height }
  }

  /**
   * Create thumbnail using Canvas API
   * @param {HTMLImageElement} image - Source image
   * @param {number} width - Thumbnail width
   * @param {number} height - Thumbnail height
   * @param {number} quality - JPEG quality (0-1)
   * @param {string} format - Output format
   * @returns {Promise<string>} Thumbnail data URL
   */
  async createThumbnail(image, width, height, quality, format) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        canvas.width = width
        canvas.height = height
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw image to canvas
        ctx.drawImage(image, 0, 0, width, height)
        
        // Convert to data URL
        const dataURL = canvas.toDataURL(format, quality)
        resolve(dataURL)
      } catch (error) {
        reject(new Error('Canvas operation failed: ' + error.message))
      }
    })
  }

  /**
   * Create cache key for thumbnail
   * @param {File|string} source - Image source
   * @param {number} maxSize - Maximum size
   * @param {number} quality - Quality setting
   * @param {string} format - Output format
   * @returns {string} Cache key
   */
  createCacheKey(source, maxSize, quality, format) {
    let sourceKey
    if (source instanceof File) {
      sourceKey = `${source.name}-${source.size}-${source.lastModified}`
    } else {
      sourceKey = source.substring(0, 50) // Use first 50 chars of data URL
    }
    
    return `${sourceKey}-${maxSize}-${quality}-${format}`
  }

  /**
   * Detect image format from file
   * @param {File} file - Image file
   * @returns {string} Image format
   */
  detectImageFormat(file) {
    if (!file || !file.type) {
      return 'unknown'
    }

    // Check MIME type first
    if (this.supportedFormats.includes(file.type)) {
      return file.type
    }

    // Fallback to file extension
    const extension = file.name.split('.').pop().toLowerCase()
    const extensionMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    }

    return extensionMap[extension] || 'unknown'
  }

  /**
   * Validate image file
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateImageFile(file) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    }

    if (!file) {
      result.isValid = false
      result.errors.push('No file provided')
      return result
    }

    // Check file type
    const format = this.detectImageFormat(file)
    if (format === 'unknown') {
      result.isValid = false
      result.errors.push('Unsupported image format')
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      result.isValid = false
      result.errors.push('File too large (max 50MB)')
    }

    // Check if file is empty
    if (file.size === 0) {
      result.isValid = false
      result.errors.push('File is empty')
    }

    // Warning for very large files
    if (file.size > 10 * 1024 * 1024) {
      result.warnings.push('Large file may take time to process')
    }

    return result
  }

  /**
   * Implement lazy loading for images
   * @param {HTMLElement} container - Container element
   * @param {Function} loadCallback - Callback to load image
   */
  setupLazyLoading(container, loadCallback) {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      loadCallback()
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadCallback(entry.target)
          observer.unobserve(entry.target)
        }
      })
    }, {
      rootMargin: '50px 0px',
      threshold: 0.1
    })

    const lazyElements = container.querySelectorAll('[data-lazy]')
    lazyElements.forEach(element => {
      observer.observe(element)
    })
  }

  /**
   * Optimize image for web display
   * @param {File} file - Original image file
   * @param {Object} options - Optimization options
   * @returns {Promise<Blob>} Optimized image blob
   */
  async optimizeImage(file, options = {}) {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'image/jpeg'
    } = options

    try {
      const image = await this.loadImage(file)
      
      // Calculate optimized dimensions
      const dimensions = this.calculateThumbnailDimensions(
        image.width,
        image.height,
        Math.max(maxWidth, maxHeight)
      )

      // If image is already smaller, return original
      if (dimensions.width >= image.width && dimensions.height >= image.height) {
        return file
      }

      // Create optimized version
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      canvas.width = dimensions.width
      canvas.height = dimensions.height
      
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height)
      
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create optimized image'))
          }
        }, format, quality)
      })
    } catch (error) {
      console.error('Failed to optimize image:', error)
      throw new Error(`Image optimization failed: ${error.message}`)
    }
  }

  /**
   * Get image metadata
   * @param {File} file - Image file
   * @returns {Promise<Object>} Image metadata
   */
  async getImageMetadata(file) {
    try {
      const image = await this.loadImage(file)
      
      return {
        width: image.width,
        height: image.height,
        aspectRatio: image.width / image.height,
        format: this.detectImageFormat(file),
        size: file.size,
        lastModified: file.lastModified
      }
    } catch (error) {
      console.error('Failed to get image metadata:', error)
      throw new Error(`Metadata extraction failed: ${error.message}`)
    }
  }

  /**
   * Clear thumbnail cache
   * @param {string} pattern - Optional pattern to clear specific cache entries
   */
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.thumbnailCache.keys()) {
        if (key.includes(pattern)) {
          this.thumbnailCache.delete(key)
        }
      }
    } else {
      this.thumbnailCache.clear()
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.thumbnailCache.size,
      maxSize: this.maxThumbnailSize,
      quality: this.quality
    }
  }
}

// Create singleton instance
export const imageService = new ImageService()
