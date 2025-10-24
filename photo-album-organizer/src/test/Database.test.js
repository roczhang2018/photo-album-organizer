/**
 * Unit tests for Database Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DatabaseService } from '../services/Database.js'

// Mock sql.js
vi.mock('sql.js', () => ({
  default: vi.fn().mockResolvedValue({
    Database: vi.fn().mockImplementation(() => ({
      exec: vi.fn(),
      prepare: vi.fn().mockReturnValue({
        run: vi.fn(),
        step: vi.fn().mockReturnValue(false),
        getAsObject: vi.fn(),
        free: vi.fn()
      }),
      getRowsModified: vi.fn().mockReturnValue(1),
      export: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
      close: vi.fn()
    }))
  })
}))

describe('DatabaseService', () => {
  let dbService

  beforeEach(() => {
    dbService = new DatabaseService()
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await dbService.init()
      expect(result).toBe(true)
      expect(dbService.isInitialized).toBe(true)
    })

    it('should handle initialization errors', async () => {
      // Mock initialization failure
      vi.spyOn(dbService, 'createTables').mockRejectedValue(new Error('Table creation failed'))
      
      await expect(dbService.init()).rejects.toThrow('Failed to initialize database')
    })
  })

  describe('Query Operations', () => {
    beforeEach(async () => {
      await dbService.init()
    })

    it('should execute queries successfully', () => {
      const result = dbService.query('SELECT * FROM albums')
      expect(result).toEqual([])
    })

    it('should handle query errors', () => {
      // Mock query failure
      dbService.db.prepare.mockImplementation(() => {
        throw new Error('Query failed')
      })

      expect(() => dbService.query('INVALID SQL')).toThrow('Database query failed')
    })

    it('should execute updates successfully', () => {
      const result = dbService.execute('INSERT INTO albums (name) VALUES (?)', ['Test Album'])
      expect(result).toHaveProperty('lastInsertRowid')
      expect(result).toHaveProperty('changes')
    })
  })

  describe('Transaction Management', () => {
    beforeEach(async () => {
      await dbService.init()
    })

    it('should begin transactions', () => {
      dbService.beginTransaction()
      expect(dbService.db.exec).toHaveBeenCalledWith('BEGIN TRANSACTION')
    })

    it('should commit transactions', () => {
      dbService.commitTransaction()
      expect(dbService.db.exec).toHaveBeenCalledWith('COMMIT')
    })

    it('should rollback transactions', () => {
      dbService.rollbackTransaction()
      expect(dbService.db.exec).toHaveBeenCalledWith('ROLLBACK')
    })
  })

  describe('Cache Management', () => {
    beforeEach(async () => {
      await dbService.init()
    })

    it('should save to localStorage', async () => {
      await dbService.save()
      expect(localStorage.setItem).toHaveBeenCalled()
    })

    it('should load from localStorage', async () => {
      // Mock existing data in localStorage
      localStorage.getItem.mockReturnValue('mock-data')
      
      const dbService2 = new DatabaseService()
      await dbService2.init()
      
      expect(localStorage.getItem).toHaveBeenCalled()
    })
  })

  describe('Statistics', () => {
    beforeEach(async () => {
      await dbService.init()
    })

    it('should return database statistics', () => {
      const stats = dbService.getStats()
      expect(stats).toHaveProperty('albumCount')
      expect(stats).toHaveProperty('photoCount')
      expect(stats).toHaveProperty('version')
      expect(stats).toHaveProperty('isInitialized')
    })

    it('should return performance statistics', () => {
      const perfStats = dbService.getPerformanceStats()
      expect(perfStats).toHaveProperty('albums')
      expect(perfStats).toHaveProperty('photos')
      expect(perfStats).toHaveProperty('indexes')
    })
  })

  describe('Query Analysis', () => {
    beforeEach(async () => {
      await dbService.init()
    })

    it('should analyze query performance', () => {
      const analysis = dbService.analyzeQuery('SELECT * FROM albums')
      expect(analysis).toHaveProperty('success')
      expect(analysis).toHaveProperty('executionTime')
      expect(analysis).toHaveProperty('query')
    })

    it('should handle query analysis errors', () => {
      // Mock query failure
      dbService.db.prepare.mockImplementation(() => {
        throw new Error('Query failed')
      })

      const analysis = dbService.analyzeQuery('INVALID SQL')
      expect(analysis.success).toBe(false)
      expect(analysis).toHaveProperty('error')
    })
  })

  describe('Optimization', () => {
    beforeEach(async () => {
      await dbService.init()
    })

    it('should optimize database', () => {
      const result = dbService.optimize()
      expect(result).toBe(true)
      expect(dbService.db.exec).toHaveBeenCalledWith('ANALYZE')
      expect(dbService.db.exec).toHaveBeenCalledWith('VACUUM')
    })
  })
})
