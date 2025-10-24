/**
 * Photo Service
 * Handles photo-related database operations
 */
import { databaseService } from './Database.js'

export class PhotoService {
  /**
   * Add photo to album
   * @param {number} albumId - Album ID
   * @param {Object} photoData - Photo data
   * @returns {Promise<Object>} Created photo
   */
  async addPhotoToAlbum(albumId, photoData) {
    const { filename, filePath, fileSize } = photoData
    
    // Validate input parameters
    if (!albumId || typeof albumId !== 'number' || !Number.isInteger(albumId) || albumId <= 0) {
      throw new Error('Album ID must be a positive integer')
    }
    
    if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
      throw new Error('Filename is required and must be a non-empty string')
    }
    
    if (filename.length > 255) {
      throw new Error('Filename must be 255 characters or less')
    }
    
    if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
      throw new Error('File path is required and must be a non-empty string')
    }
    
    if (!fileSize || typeof fileSize !== 'number' || fileSize < 0 || !Number.isInteger(fileSize)) {
      throw new Error('File size must be a non-negative integer')
    }

    try {
      // Check if album exists
      const album = databaseService.query('SELECT id FROM albums WHERE id = ?', [albumId])
      if (album.length === 0) {
        throw new Error('Album not found')
      }

      // Check if photo already exists in this album
      const existing = databaseService.query(
        'SELECT id FROM photos WHERE album_id = ? AND filename = ?',
        [albumId, filename]
      )
      
      if (existing.length > 0) {
        throw new Error('Photo already exists in this album')
      }

      const result = databaseService.execute(
        'INSERT INTO photos (album_id, filename, file_path, file_size) VALUES (?, ?, ?, ?)',
        [albumId, filename, filePath, fileSize]
      )
      
      await databaseService.save()
      
      return {
        id: result.lastInsertRowid,
        albumId,
        filename,
        filePath,
        fileSize,
        addedDate: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to add photo to album:', error)
      throw new Error(`Failed to add photo: ${error.message}`)
    }
  }

  /**
   * Get photos in album
   * @param {number} albumId - Album ID
   * @returns {Promise<Array>} Array of photos
   */
  async getPhotosInAlbum(albumId) {
    try {
      const photos = databaseService.query(
        `SELECT 
          id,
          album_id as albumId,
          filename,
          file_path as filePath,
          file_size as fileSize,
          added_date as addedDate
        FROM photos 
        WHERE album_id = ? 
        ORDER BY added_date DESC`,
        [albumId]
      )
      
      return photos
    } catch (error) {
      console.error('Failed to get photos in album:', error)
      throw new Error(`Failed to get photos: ${error.message}`)
    }
  }

  /**
   * Get photo by ID
   * @param {number} id - Photo ID
   * @returns {Promise<Object|null>} Photo or null if not found
   */
  async getPhotoById(id) {
    try {
      const photos = databaseService.query(
        `SELECT 
          id,
          album_id as albumId,
          filename,
          file_path as filePath,
          file_size as fileSize,
          added_date as addedDate
        FROM photos 
        WHERE id = ?`,
        [id]
      )
      
      return photos.length > 0 ? photos[0] : null
    } catch (error) {
      console.error('Failed to get photo by ID:', error)
      throw new Error(`Failed to get photo: ${error.message}`)
    }
  }

  /**
   * Remove photo from album
   * @param {number} photoId - Photo ID
   * @returns {Promise<void>}
   */
  async removePhotoFromAlbum(photoId) {
    try {
      const result = databaseService.execute('DELETE FROM photos WHERE id = ?', [photoId])
      
      if (result.changes === 0) {
        throw new Error('Photo not found')
      }
      
      await databaseService.save()
    } catch (error) {
      console.error('Failed to remove photo from album:', error)
      throw new Error(`Failed to remove photo: ${error.message}`)
    }
  }

  /**
   * Update photo metadata
   * @param {number} id - Photo ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated photo
   */
  async updatePhoto(id, updates) {
    try {
      const allowedFields = ['filename', 'file_path', 'file_size']
      const updateFields = []
      const params = []
      
      for (const [field, value] of Object.entries(updates)) {
        if (allowedFields.includes(field)) {
          updateFields.push(`${field} = ?`)
          params.push(value)
        }
      }
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update')
      }
      
      params.push(id)
      
      const sql = `UPDATE photos SET ${updateFields.join(', ')} WHERE id = ?`
      const result = databaseService.execute(sql, params)
      
      if (result.changes === 0) {
        throw new Error('Photo not found')
      }
      
      await databaseService.save()
      
      return await this.getPhotoById(id)
    } catch (error) {
      console.error('Failed to update photo:', error)
      throw new Error(`Failed to update photo: ${error.message}`)
    }
  }

  /**
   * Get all photos across all albums
   * @returns {Promise<Array>} Array of all photos
   */
  async getAllPhotos() {
    try {
      const photos = databaseService.query(
        `SELECT 
          p.id,
          p.album_id as albumId,
          p.filename,
          p.file_path as filePath,
          p.file_size as fileSize,
          p.added_date as addedDate,
          a.name as albumName,
          a.week_group as weekGroup
        FROM photos p
        JOIN albums a ON p.album_id = a.id
        ORDER BY p.added_date DESC`
      )
      
      return photos
    } catch (error) {
      console.error('Failed to get all photos:', error)
      throw new Error(`Failed to get all photos: ${error.message}`)
    }
  }

  /**
   * Get photo count for album
   * @param {number} albumId - Album ID
   * @returns {Promise<number>} Photo count
   */
  async getPhotoCount(albumId) {
    try {
      const result = databaseService.query(
        'SELECT COUNT(*) as count FROM photos WHERE album_id = ?',
        [albumId]
      )
      
      return result[0].count
    } catch (error) {
      console.error('Failed to get photo count:', error)
      throw new Error(`Failed to get photo count: ${error.message}`)
    }
  }

  /**
   * Search photos by filename
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of matching photos
   */
  async searchPhotos(searchTerm) {
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
      throw new Error('Search term is required and must be a non-empty string')
    }

    try {
      const photos = databaseService.query(
        `SELECT 
          p.id,
          p.album_id as albumId,
          p.filename,
          p.file_path as filePath,
          p.file_size as fileSize,
          p.added_date as addedDate,
          a.name as albumName,
          a.week_group as weekGroup
        FROM photos p
        JOIN albums a ON p.album_id = a.id
        WHERE p.filename LIKE ?
        ORDER BY p.added_date DESC`,
        [`%${searchTerm}%`]
      )
      
      return photos
    } catch (error) {
      console.error('Failed to search photos:', error)
      throw new Error(`Failed to search photos: ${error.message}`)
    }
  }

  /**
   * Validate file path format
   * @param {string} filePath - File path to validate
   * @returns {boolean} True if valid
   */
  validateFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return false
    }
    
    // Basic validation - should not be empty and should not contain invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/
    return filePath.trim().length > 0 && !invalidChars.test(filePath)
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
   * Check if file is a supported image format
   * @param {string} filename - Filename to check
   * @returns {boolean} True if supported image format
   */
  isSupportedImageFormat(filename) {
    const extension = this.getFileExtension(filename)
    const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
    return supportedFormats.includes(extension)
  }

  /**
   * Get photos by file extension
   * @param {string} extension - File extension (without dot)
   * @returns {Promise<Array>} Array of photos with matching extension
   */
  async getPhotosByExtension(extension) {
    if (!extension || typeof extension !== 'string') {
      throw new Error('File extension is required and must be a string')
    }

    try {
      const photos = databaseService.query(
        `SELECT 
          p.id,
          p.album_id as albumId,
          p.filename,
          p.file_path as filePath,
          p.file_size as fileSize,
          p.added_date as addedDate,
          a.name as albumName,
          a.week_group as weekGroup
        FROM photos p
        JOIN albums a ON p.album_id = a.id
        WHERE LOWER(p.filename) LIKE ?
        ORDER BY p.added_date DESC`,
        [`%.${extension.toLowerCase()}`]
      )
      
      return photos
    } catch (error) {
      console.error('Failed to get photos by extension:', error)
      throw new Error(`Failed to get photos by extension: ${error.message}`)
    }
  }
}

// Create singleton instance
export const photoService = new PhotoService()
