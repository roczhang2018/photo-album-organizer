/**
 * Album Service
 * Handles album-related database operations
 */
import { databaseService } from './Database.js'
import { cacheService } from './CacheService.js'
import { photoService } from './PhotoService.js'

export class AlbumService {
  /**
   * Create a new album
   * @param {string} name - Album name
   * @param {string} weekGroup - Week group (YYYY-W## format)
   * @param {number} sortOrder - Sort order within week group
   * @returns {Promise<Object>} Created album
   */
  async createAlbum(name, weekGroup, sortOrder = 0) {
    // Validate input parameters
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Album name is required and must be a non-empty string')
    }
    
    if (name.length > 100) {
      throw new Error('Album name must be 100 characters or less')
    }
    
    if (!weekGroup || typeof weekGroup !== 'string') {
      throw new Error('Week group is required and must be a string')
    }
    
    // Validate week group format (YYYY-W##)
    const weekGroupRegex = /^\d{4}-W\d{2}$/
    if (!weekGroupRegex.test(weekGroup)) {
      throw new Error('Week group must be in format YYYY-W## (e.g., 2024-W01)')
    }
    
    if (typeof sortOrder !== 'number' || sortOrder < 0 || !Number.isInteger(sortOrder)) {
      throw new Error('Sort order must be a non-negative integer')
    }

    try {
      const result = await databaseService.execute(
        'INSERT INTO albums (name, week_group, sort_order) VALUES (?, ?, ?)',
        [name, weekGroup, sortOrder]
      )
      
      await databaseService.save()
      
      return {
        id: result.lastInsertRowid,
        name,
        weekGroup,
        sortOrder,
        createdDate: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to create album:', error)
      throw new Error(`Failed to create album: ${error.message}`)
    }
  }

  /**
   * Get all albums
   * @param {string} weekGroup - Optional week group filter
   * @returns {Promise<Array>} Array of albums
   */
  async getAlbums(weekGroup = null) {
    try {
      let sql = `
        SELECT 
          id,
          name,
          week_group as weekGroup,
          created_date as createdDate,
          sort_order as sortOrder
        FROM albums
      `
      
      const params = []
      if (weekGroup) {
        sql += ' WHERE week_group = ?'
        params.push(weekGroup)
      }
      
      sql += ' ORDER BY week_group, sort_order'
      
      const albums = await databaseService.query(sql, params)
      
      // Get photo count for each album
      for (const album of albums) {
        const photoCountResult = await databaseService.query(
          'SELECT COUNT(*) as count FROM photos WHERE album_id = ?',
          [album.id]
        )
        album.photoCount = photoCountResult[0]?.count || 0
      }
      
      return albums
    } catch (error) {
      console.error('Failed to get albums:', error)
      throw new Error(`Failed to get albums: ${error.message}`)
    }
  }

  /**
   * Get album by ID
   * @param {number} id - Album ID
   * @returns {Promise<Object|null>} Album or null if not found
   */
  async getAlbumById(id) {
    try {
      const albums = databaseService.query(
        'SELECT id, name, week_group as weekGroup, created_date as createdDate, sort_order as sortOrder FROM albums WHERE id = ?',
        [id]
      )
      
      if (albums.length === 0) {
        return null
      }
      
      const album = albums[0]
      
      // Get photo count
      const photoCountResult = databaseService.query(
        'SELECT COUNT(*) as count FROM photos WHERE album_id = ?',
        [album.id]
      )
      album.photoCount = photoCountResult[0]?.count || 0
      
      return album
    } catch (error) {
      console.error('Failed to get album by ID:', error)
      throw new Error(`Failed to get album: ${error.message}`)
    }
  }

  /**
   * Update album
   * @param {number} id - Album ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated album
   */
  async updateAlbum(id, updates) {
    try {
      const allowedFields = ['name', 'sort_order']
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
      
      const sql = `UPDATE albums SET ${updateFields.join(', ')} WHERE id = ?`
      const result = await databaseService.execute(sql, params)
      
      if (result.changes === 0) {
        throw new Error('Album not found')
      }
      
      await databaseService.save()
      
      return await this.getAlbumById(id)
    } catch (error) {
      console.error('Failed to update album:', error)
      throw new Error(`Failed to update album: ${error.message}`)
    }
  }

  /**
   * Delete album
   * @param {number} id - Album ID
   * @returns {Promise<void>}
   */
  async deleteAlbum(id) {
    // Validate input
    if (!id || typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      throw new Error('Album ID must be a positive integer')
    }

    try {
      // Check if album exists first
      const album = await this.getAlbumById(id)
      if (!album) {
        throw new Error('Album not found')
      }

      // Get photo count for confirmation
      const photoCount = await photoService.getPhotoCount(id)
      
      // Delete album (cascade delete will remove associated photos)
      const result = await databaseService.execute('DELETE FROM albums WHERE id = ?', [id])
      
      if (result.changes === 0) {
        throw new Error('Failed to delete album')
      }
      
      await databaseService.save()
      
      console.log(`Album "${album.name}" deleted successfully. ${photoCount} photos were also removed.`)
    } catch (error) {
      console.error('Failed to delete album:', error)
      throw new Error(`Failed to delete album: ${error.message}`)
    }
  }

  /**
   * Reorder albums within a week group
   * @param {string} weekGroup - Week group
   * @param {Array<number>} newOrder - Array of album IDs in new order
   * @returns {Promise<void>}
   */
  async reorderAlbums(weekGroup, newOrder) {
    try {
      databaseService.beginTransaction()
      
      for (let i = 0; i < newOrder.length; i++) {
        await databaseService.execute(
          'UPDATE albums SET sort_order = ? WHERE id = ? AND week_group = ?',
          [i, newOrder[i], weekGroup]
        )
      }
      
      databaseService.commitTransaction()
      await databaseService.save()
    } catch (error) {
      databaseService.rollbackTransaction()
      console.error('Failed to reorder albums:', error)
      throw new Error(`Failed to reorder albums: ${error.message}`)
    }
  }

  /**
   * Get albums grouped by week
   * @returns {Promise<Object>} Albums grouped by week
   */
  async getAlbumsByWeek() {
    try {
      const albums = await this.getAlbums()
      const grouped = {}
      
      for (const album of albums) {
        if (!grouped[album.weekGroup]) {
          grouped[album.weekGroup] = []
        }
        grouped[album.weekGroup].push(album)
      }
      
      return grouped
    } catch (error) {
      console.error('Failed to get albums by week:', error)
      throw new Error(`Failed to get albums by week: ${error.message}`)
    }
  }
}

// Create singleton instance
export const albumService = new AlbumService()
