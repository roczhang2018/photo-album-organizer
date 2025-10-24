/**
 * Default Image Service
 * Provides default images for empty states and placeholders
 */

export class DefaultImageService {
  constructor() {
    // Base64 encoded default image (a placeholder for now)
    // In a real application, this would be the actual image data
    this.defaultImageDataUrl = this.createDefaultImageDataUrl()
  }

  /**
   * Create a default image data URL
   * This creates a simple placeholder image
   * In production, you would replace this with the actual image
   */
  createDefaultImageDataUrl() {
    // Create a canvas to generate a placeholder image
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 300
    const ctx = canvas.getContext('2d')
    
    // Create a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 400, 300)
    gradient.addColorStop(0, '#f0f8ff')
    gradient.addColorStop(1, '#e6f3ff')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 300)
    
    // Add some decorative elements
    ctx.fillStyle = '#007bff'
    ctx.font = '24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('📷', 200, 120)
    
    ctx.fillStyle = '#666'
    ctx.font = '16px Arial'
    ctx.fillText('No photos yet', 200, 160)
    ctx.fillText('Upload your first photo', 200, 180)
    
    return canvas.toDataURL('image/png')
  }

  /**
   * Get default image for empty album
   * @returns {string} Data URL of default image
   */
  getDefaultAlbumImage() {
    return this.defaultImageDataUrl
  }

  /**
   * Get default image for photo placeholder
   * @returns {string} Data URL of default image
   */
  getDefaultPhotoImage() {
    return this.defaultImageDataUrl
  }

  /**
   * Get default image for user avatar
   * @returns {string} Data URL of default image
   */
  getDefaultAvatarImage() {
    return this.defaultImageDataUrl
  }

  /**
   * Check if an image URL is a default image
   * @param {string} imageUrl - Image URL to check
   * @returns {boolean} True if it's a default image
   */
  isDefaultImage(imageUrl) {
    return imageUrl === this.defaultImageDataUrl
  }

  /**
   * Create a default photo object
   * @param {number} albumId - Album ID
   * @returns {Object} Default photo object
   */
  createDefaultPhoto(albumId) {
    return {
      id: 'default',
      albumId: albumId,
      filename: 'default-photo.png',
      filePath: this.defaultImageDataUrl,
      fileSize: 0,
      addedDate: new Date().toISOString(),
      isDefault: true
    }
  }
}

// Export singleton instance
export const defaultImageService = new DefaultImageService()
