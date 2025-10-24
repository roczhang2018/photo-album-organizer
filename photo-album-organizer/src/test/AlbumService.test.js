/**
 * Unit tests for Album Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AlbumService } from '../services/AlbumService.js'

// Mock database service
vi.mock('../services/Database.js', () => ({
  databaseService: {
    execute: vi.fn(),
    query: vi.fn(),
    save: vi.fn()
  }
}))

// Mock cache service
vi.mock('../services/CacheService.js', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn()
  }
}))

import { databaseService } from '../services/Database.js'
import { cacheService } from '../services/CacheService.js'

describe('AlbumService', () => {
  let albumService

  beforeEach(() => {
    albumService = new AlbumService()
    vi.clearAllMocks()
  })

  describe('createAlbum', () => {
    it('should create album with valid data', async () => {
      const mockResult = { lastInsertRowid: 1, changes: 1 }
      databaseService.execute.mockReturnValue(mockResult)
      databaseService.save.mockResolvedValue()

      const result = await albumService.createAlbum('Test Album', '2024-W01', 0)

      expect(result).toEqual({
        id: 1,
        name: 'Test Album',
        weekGroup: '2024-W01',
        sortOrder: 0,
        createdDate: expect.any(String)
      })
      expect(databaseService.execute).toHaveBeenCalledWith(
        'INSERT INTO albums (name, week_group, sort_order) VALUES (?, ?, ?)',
        ['Test Album', '2024-W01', 0]
      )
    })

    it('should validate album name', async () => {
      await expect(albumService.createAlbum('', '2024-W01', 0))
        .rejects.toThrow('Album name is required and must be a non-empty string')

      await expect(albumService.createAlbum('a'.repeat(101), '2024-W01', 0))
        .rejects.toThrow('Album name must be 100 characters or less')
    })

    it('should validate week group format', async () => {
      await expect(albumService.createAlbum('Test', '2024-01', 0))
        .rejects.toThrow('Week group must be in format YYYY-W##')

      await expect(albumService.createAlbum('Test', 'invalid', 0))
        .rejects.toThrow('Week group must be in format YYYY-W##')
    })

    it('should validate sort order', async () => {
      await expect(albumService.createAlbum('Test', '2024-W01', -1))
        .rejects.toThrow('Sort order must be a non-negative integer')

      await expect(albumService.createAlbum('Test', '2024-W01', 1.5))
        .rejects.toThrow('Sort order must be a non-negative integer')
    })

    it('should handle database errors', async () => {
      databaseService.execute.mockImplementation(() => {
        throw new Error('Database error')
      })

      await expect(albumService.createAlbum('Test', '2024-W01', 0))
        .rejects.toThrow('Failed to create album: Database error')
    })
  })

  describe('getAlbums', () => {
    it('should return albums from cache when available', async () => {
      const cachedAlbums = [
        { id: 1, name: 'Album 1', weekGroup: '2024-W01', photoCount: 5 },
        { id: 2, name: 'Album 2', weekGroup: '2024-W02', photoCount: 3 }
      ]
      cacheService.get.mockReturnValue(cachedAlbums)

      const result = await albumService.getAlbums()

      expect(result).toEqual(cachedAlbums)
      expect(cacheService.get).toHaveBeenCalledWith('albums_all')
      expect(databaseService.query).not.toHaveBeenCalled()
    })

    it('should fetch from database when not cached', async () => {
      const mockAlbums = [
        { id: 1, name: 'Album 1', weekGroup: '2024-W01' },
        { id: 2, name: 'Album 2', weekGroup: '2024-W02' }
      ]
      cacheService.get.mockReturnValue(null)
      databaseService.query
        .mockReturnValueOnce(mockAlbums) // albums query
        .mockReturnValueOnce([{ count: 5 }]) // photo count for album 1
        .mockReturnValueOnce([{ count: 3 }]) // photo count for album 2
      databaseService.save.mockResolvedValue()

      const result = await albumService.getAlbums()

      expect(result).toEqual([
        { id: 1, name: 'Album 1', weekGroup: '2024-W01', photoCount: 5 },
        { id: 2, name: 'Album 2', weekGroup: '2024-W02', photoCount: 3 }
      ])
      expect(cacheService.set).toHaveBeenCalledWith('albums_all', expect.any(Array), 120000)
    })

    it('should filter by week group', async () => {
      cacheService.get.mockReturnValue(null)
      databaseService.query.mockReturnValue([])
      databaseService.save.mockResolvedValue()

      await albumService.getAlbums('2024-W01')

      expect(cacheService.get).toHaveBeenCalledWith('albums_2024-W01')
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE week_group = ?'),
        ['2024-W01']
      )
    })
  })

  describe('getAlbumById', () => {
    it('should return album by ID', async () => {
      const mockAlbum = { id: 1, name: 'Test Album', weekGroup: '2024-W01' }
      databaseService.query.mockReturnValue([mockAlbum])

      const result = await albumService.getAlbumById(1)

      expect(result).toEqual(mockAlbum)
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE a.id = ?'),
        [1]
      )
    })

    it('should return null for non-existent album', async () => {
      databaseService.query.mockReturnValue([])

      const result = await albumService.getAlbumById(999)

      expect(result).toBeNull()
    })

    it('should validate album ID', async () => {
      await expect(albumService.getAlbumById(0))
        .rejects.toThrow('Album ID must be a positive integer')

      await expect(albumService.getAlbumById(-1))
        .rejects.toThrow('Album ID must be a positive integer')

      await expect(albumService.getAlbumById(1.5))
        .rejects.toThrow('Album ID must be a positive integer')
    })
  })

  describe('updateAlbum', () => {
    it('should update album with valid data', async () => {
      const mockResult = { changes: 1 }
      const mockUpdatedAlbum = { id: 1, name: 'Updated Album', weekGroup: '2024-W01' }
      
      databaseService.execute.mockReturnValue(mockResult)
      databaseService.query.mockReturnValue([mockUpdatedAlbum])
      databaseService.save.mockResolvedValue()

      const result = await albumService.updateAlbum(1, { name: 'Updated Album' })

      expect(result).toEqual(mockUpdatedAlbum)
      expect(databaseService.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE albums SET'),
        ['Updated Album', 1]
      )
    })

    it('should validate update data', async () => {
      await expect(albumService.updateAlbum(1, {}))
        .rejects.toThrow('Updates object is required and cannot be empty')

      await expect(albumService.updateAlbum(1, { name: '' }))
        .rejects.toThrow('Album name must be a non-empty string')

      await expect(albumService.updateAlbum(1, { week_group: 'invalid' }))
        .rejects.toThrow('Week group must be in format YYYY-W##')
    })

    it('should handle non-existent album', async () => {
      databaseService.execute.mockReturnValue({ changes: 0 })

      await expect(albumService.updateAlbum(999, { name: 'Test' }))
        .rejects.toThrow('Album not found')
    })
  })

  describe('deleteAlbum', () => {
    it('should delete album successfully', async () => {
      const mockAlbum = { id: 1, name: 'Test Album' }
      const mockResult = { changes: 1 }
      
      databaseService.query.mockReturnValue([mockAlbum])
      databaseService.execute.mockReturnValue(mockResult)
      databaseService.save.mockResolvedValue()

      await albumService.deleteAlbum(1)

      expect(databaseService.execute).toHaveBeenCalledWith(
        'DELETE FROM albums WHERE id = ?',
        [1]
      )
    })

    it('should handle non-existent album', async () => {
      databaseService.query.mockReturnValue([])

      await expect(albumService.deleteAlbum(999))
        .rejects.toThrow('Album not found')
    })
  })

  describe('reorderAlbums', () => {
    it('should reorder albums successfully', async () => {
      databaseService.execute.mockReturnValue({ changes: 1 })
      databaseService.save.mockResolvedValue()

      await albumService.reorderAlbums('2024-W01', [3, 1, 2])

      expect(databaseService.execute).toHaveBeenCalledTimes(3)
      expect(databaseService.execute).toHaveBeenCalledWith(
        'UPDATE albums SET sort_order = ? WHERE id = ? AND week_group = ?',
        [0, 3, '2024-W01']
      )
    })

    it('should validate reorder data', async () => {
      await expect(albumService.reorderAlbums('', [1, 2, 3]))
        .rejects.toThrow('Week group is required')

      await expect(albumService.reorderAlbums('2024-W01', []))
        .rejects.toThrow('New order must be an array of positive integers')

      await expect(albumService.reorderAlbums('2024-W01', [1, -1, 3]))
        .rejects.toThrow('New order must be an array of positive integers')
    })
  })

  describe('getAlbumsByWeek', () => {
    it('should group albums by week', async () => {
      const mockAlbums = [
        { id: 1, name: 'Album 1', weekGroup: '2024-W01', photoCount: 5 },
        { id: 2, name: 'Album 2', weekGroup: '2024-W01', photoCount: 3 },
        { id: 3, name: 'Album 3', weekGroup: '2024-W02', photoCount: 2 }
      ]
      
      vi.spyOn(albumService, 'getAlbums').mockResolvedValue(mockAlbums)

      const result = await albumService.getAlbumsByWeek()

      expect(result).toEqual({
        '2024-W01': [
          { id: 1, name: 'Album 1', weekGroup: '2024-W01', photoCount: 5 },
          { id: 2, name: 'Album 2', weekGroup: '2024-W01', photoCount: 3 }
        ],
        '2024-W02': [
          { id: 3, name: 'Album 3', weekGroup: '2024-W02', photoCount: 2 }
        ]
      })
    })
  })

  describe('getPhotoCount', () => {
    it('should return photo count for album', async () => {
      databaseService.query.mockReturnValue([{ count: 15 }])

      const count = await albumService.getPhotoCount(1)

      expect(count).toBe(15)
      expect(databaseService.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM photos WHERE album_id = ?',
        [1]
      )
    })

    it('should validate album ID', async () => {
      await expect(albumService.getPhotoCount(0))
        .rejects.toThrow('Album ID must be a positive integer')
    })
  })
})
