/**
 * Database Service
 * Handles SQLite database operations using sql.js
 */
export class DatabaseService {
  constructor() {
    this.db = null
    this.isInitialized = false
    this.useMockDatabase = false
  }

  /**
   * Initialize the database
   * @returns {Promise<void>}
   */
  async init() {
    try {
      console.log('Database: Starting initialization...')
      
      // For now, use mock database to avoid SQL.js issues
      console.log('Database: Using mock database for stability')
      this.useMockDatabase = true
      
      // Try to load existing mock data from localStorage
      const savedMockData = localStorage.getItem('photo-album-db-mock')
      if (savedMockData) {
        try {
          this.mockData = JSON.parse(savedMockData)
          console.log('Database: Loaded existing mock data from localStorage')
        } catch (parseError) {
          console.warn('Database: Failed to parse saved mock data, using fresh data')
          this.mockData = {
            albums: [],
            photos: []
          }
        }
      } else {
        this.mockData = {
          albums: [],
          photos: []
        }
        console.log('Database: Created fresh mock data')
      }
      
      this.isInitialized = true
      console.log('Database: Mock database initialized successfully')
      
    } catch (error) {
      console.error('Database: Initialization failed:', error)
      throw new Error(`Database initialization failed: ${error.message}`)
    }
  }

  async initializeSQL() {
    // Import sql.js dynamically
    const initSqlJs = await import('sql.js')
    console.log('Database: SQL.js imported successfully')
    
    // Try multiple initialization strategies
    let SQL = null
    
    // Strategy 1: Try with unpkg CDN
    try {
      console.log('Database: Trying unpkg CDN...')
      SQL = await initSqlJs.default({
        locateFile: (file) => {
          if (file.endsWith('.wasm')) {
            return `https://unpkg.com/sql.js@1.8.0/dist/${file}`
          }
          return file
        }
      })
      console.log('Database: Successfully initialized with unpkg CDN')
    } catch (error) {
      console.warn('Database: unpkg CDN failed:', error.message)
    }
    
    // Strategy 2: Try with jsdelivr CDN
    if (!SQL) {
      try {
        console.log('Database: Trying jsdelivr CDN...')
        SQL = await initSqlJs.default({
          locateFile: (file) => {
            if (file.endsWith('.wasm')) {
              return `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
            }
            return file
          }
        })
        console.log('Database: Successfully initialized with jsdelivr CDN')
      } catch (error) {
        console.warn('Database: jsdelivr CDN failed:', error.message)
      }
    }
    
    // Strategy 3: Try without external WASM (local)
    if (!SQL) {
      try {
        console.log('Database: Trying local WASM...')
        SQL = await initSqlJs.default()
        console.log('Database: Successfully initialized with local WASM')
      } catch (error) {
        console.warn('Database: Local WASM failed:', error.message)
      }
    }
    
    if (!SQL) {
      throw new Error('All SQL.js initialization strategies failed')
    }
    
    return SQL
  }

  /**
   * Create database tables
   * @returns {Promise<void>}
   */
  async createTables() {
    if (this.useMockDatabase) {
      console.log('Database: Mock database - no tables to create')
      return
    }
    
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      console.log('Database: Creating tables...')
      
      // Create albums table with validation
      console.log('Database: Creating albums table...')
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS albums (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL CHECK(length(name) > 0 AND length(name) <= 100),
          week_group TEXT NOT NULL CHECK(length(week_group) > 0 AND week_group LIKE '____-W__'),
          created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          sort_order INTEGER NOT NULL DEFAULT 0 CHECK(sort_order >= 0),
          UNIQUE(week_group, sort_order)
        )
      `)
      console.log('Database: Albums table created successfully')

      // Create photos table with validation
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          album_id INTEGER NOT NULL,
          filename TEXT NOT NULL CHECK(length(filename) > 0 AND length(filename) <= 255),
          file_path TEXT NOT NULL CHECK(length(file_path) > 0),
          file_size INTEGER NOT NULL CHECK(file_size >= 0),
          added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
          UNIQUE(album_id, filename)
        )
      `)

             // Create indexes for performance
             this.db.exec(`
               CREATE INDEX IF NOT EXISTS idx_albums_week_group ON albums(week_group)
             `)
             
             this.db.exec(`
               CREATE INDEX IF NOT EXISTS idx_albums_sort_order ON albums(week_group, sort_order)
             `)
             
             this.db.exec(`
               CREATE INDEX IF NOT EXISTS idx_albums_created_date ON albums(created_date)
             `)
             
             this.db.exec(`
               CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id)
             `)
             
             this.db.exec(`
               CREATE INDEX IF NOT EXISTS idx_photos_filename ON photos(filename)
             `)
             
             this.db.exec(`
               CREATE INDEX IF NOT EXISTS idx_photos_added_date ON photos(added_date)
             `)
             
             this.db.exec(`
               CREATE INDEX IF NOT EXISTS idx_photos_album_filename ON photos(album_id, filename)
             `)

      // Create database version table for migrations
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS db_version (
          version INTEGER PRIMARY KEY,
          applied_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Check current version and apply migrations
      await this.applyMigrations()
      
      // Save the database
      await this.save()
      
      console.log('Database tables created successfully')
    } catch (error) {
      console.error('Failed to create tables:', error)
      throw new Error('Table creation failed')
    }
  }

  /**
   * Save database to localStorage
   * @returns {Promise<void>}
   */
  async save() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized')
    }

    try {
      if (this.useMockDatabase) {
        // For mock database, save to localStorage as JSON
        localStorage.setItem('photo-album-db-mock', JSON.stringify(this.mockData))
        console.log('Mock database saved to localStorage')
        return
      }

      const data = this.db.export()
      const dataArray = Array.from(data)
      localStorage.setItem('photo-album-db', JSON.stringify(dataArray))
    } catch (error) {
      console.error('Failed to save database:', error)
      throw new Error('Database save failed')
    }
  }

  /**
   * Execute a SQL query
   * @param {string} sql - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(sql, params = []) {
    if (this.useMockDatabase) {
      return this.mockQuery(sql, params)
    }
    
    if (!this.isInitialized) {
      throw new Error('Database not initialized')
    }

    try {
      const stmt = this.db.prepare(sql)
      const results = []
      
      while (stmt.step()) {
        results.push(stmt.getAsObject())
      }
      
      stmt.free()
      return results
    } catch (error) {
      console.error('Query failed:', error)
      throw new Error(`Query failed: ${error.message}`)
    }
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE)
   * @param {string} sql - SQL statement
   * @param {Array} params - Statement parameters
   * @returns {Promise<Object>} Execution result
   */
  async execute(sql, params = []) {
    if (this.useMockDatabase) {
      return this.mockExecute(sql, params)
    }
    
    if (!this.isInitialized) {
      throw new Error('Database not initialized')
    }

    try {
      const stmt = this.db.prepare(sql)
      const result = stmt.run(params)
      stmt.free()
      return result
    } catch (error) {
      console.error('Execute failed:', error)
      throw new Error(`Execute failed: ${error.message}`)
    }
  }

  /**
   * Mock query implementation
   * @param {string} sql - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Array} Query results
   */
  mockQuery(sql, params = []) {
    console.log('Mock Database: Query:', sql, params)
    
    if (sql.includes('SELECT COUNT(*) as count FROM albums')) {
      return [{ count: this.mockData.albums.length }]
    }
    
    if (sql.includes('SELECT COUNT(*) as count FROM photos')) {
      const albumId = params[0]
      const count = this.mockData.photos.filter(p => p.album_id === albumId).length
      return [{ count }]
    }
    
    if (sql.includes('SELECT') && sql.includes('FROM albums')) {
      return this.mockData.albums.map(album => ({
        id: album.id,
        name: album.name,
        weekGroup: album.week_group,
        createdDate: album.created_date,
        sortOrder: album.sort_order
      }))
    }
    
    if (sql.includes('SELECT') && sql.includes('FROM photos')) {
      let photos = this.mockData.photos
      
      // Filter by album_id if specified
      if (sql.includes('WHERE album_id = ?') && params.length > 0) {
        photos = photos.filter(p => p.album_id === params[0])
      }
      
      // Filter by id if specified
      if (sql.includes('WHERE id = ?') && params.length > 0) {
        photos = photos.filter(p => p.id === params[0])
      }
      
      // Filter by filename if specified
      if (sql.includes('filename = ?') && params.length > 0) {
        const filenameParam = params.find((_, index) => 
          sql.includes('filename = ?') && 
          sql.indexOf('filename = ?', sql.indexOf('filename = ?') + 1) === -1 ? 
          index === params.length - 1 : false
        )
        if (filenameParam !== undefined) {
          photos = photos.filter(p => p.filename === filenameParam)
        }
      }
      
      return photos.map(photo => ({
        id: photo.id,
        albumId: photo.album_id,
        filename: photo.filename,
        filePath: photo.file_path,
        fileSize: photo.file_size,
        addedDate: photo.added_date
      }))
    }
    
    return []
  }

  /**
   * Mock execute implementation
   * @param {string} sql - SQL statement
   * @param {Array} params - Statement parameters
   * @returns {Object} Execution result
   */
  mockExecute(sql, params = []) {
    console.log('Mock Database: Execute:', sql, params)
    
    if (sql.includes('INSERT INTO albums')) {
      const newId = this.mockData.albums.length + 1
      const album = {
        id: newId,
        name: params[0],
        week_group: params[1],
        sort_order: params[2],
        created_date: new Date().toISOString()
      }
      this.mockData.albums.push(album)
      return { lastInsertRowid: newId, changes: 1 }
    }
    
    if (sql.includes('INSERT INTO photos')) {
      const newId = this.mockData.photos.length + 1
      const photo = {
        id: newId,
        album_id: params[0],
        filename: params[1],
        file_path: params[2],
        file_size: params[3],
        added_date: new Date().toISOString()
      }
      this.mockData.photos.push(photo)
      return { lastInsertRowid: newId, changes: 1 }
    }
    
    if (sql.includes('DELETE FROM albums')) {
      const albumId = params[0]
      const index = this.mockData.albums.findIndex(a => a.id === albumId)
      if (index !== -1) {
        this.mockData.albums.splice(index, 1)
        // Also remove associated photos
        this.mockData.photos = this.mockData.photos.filter(p => p.album_id !== albumId)
        return { changes: 1 }
      }
      return { changes: 0 }
    }
    
    if (sql.includes('DELETE FROM photos')) {
      const photoId = params[0]
      const index = this.mockData.photos.findIndex(p => p.id === photoId)
      if (index !== -1) {
        this.mockData.photos.splice(index, 1)
        return { changes: 1 }
      }
      return { changes: 0 }
    }
    
    if (sql.includes('UPDATE albums')) {
      const albumId = params[params.length - 1] // Last param is usually the ID
      const album = this.mockData.albums.find(a => a.id === albumId)
      if (album) {
        if (sql.includes('name = ?')) {
          album.name = params[0]
        }
        if (sql.includes('sort_order = ?')) {
          album.sort_order = params[0]
        }
        return { changes: 1 }
      }
      return { changes: 0 }
    }
    
    return { changes: 0 }
  }

  /**
   * Begin a transaction
   */
  beginTransaction() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized')
    }
    this.db.exec('BEGIN TRANSACTION')
  }

  /**
   * Commit a transaction
   */
  commitTransaction() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized')
    }
    this.db.exec('COMMIT')
  }

  /**
   * Rollback a transaction
   */
  rollbackTransaction() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized')
    }
    this.db.exec('ROLLBACK')
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
      this.isInitialized = false
    }
  }

  /**
   * Apply database migrations
   */
  async applyMigrations() {
    const currentVersion = this.getCurrentVersion()
    const migrations = this.getMigrations()
    
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        try {
          console.log(`Applying migration ${migration.version}: ${migration.description}`)
          this.db.exec(migration.sql)
          this.db.exec('INSERT INTO db_version (version) VALUES (?)', [migration.version])
          console.log(`Migration ${migration.version} applied successfully`)
        } catch (error) {
          console.error(`Failed to apply migration ${migration.version}:`, error)
          throw new Error(`Migration ${migration.version} failed: ${error.message}`)
        }
      }
    }
  }

  /**
   * Get current database version
   * @returns {number} Current version
   */
  getCurrentVersion() {
    try {
      const result = this.query('SELECT MAX(version) as version FROM db_version')
      return result[0]?.version || 0
    } catch (error) {
      return 0
    }
  }

  /**
   * Get available migrations
   * @returns {Array} Array of migration objects
   */
  getMigrations() {
    return [
      {
        version: 1,
        description: 'Initial schema with albums and photos tables',
        sql: `
          -- Migration 1: Initial schema (already applied during table creation)
          -- This is a placeholder for future migrations
        `
      }
      // Future migrations can be added here
    ]
  }

  /**
   * Get database statistics
   * @returns {Object} Database statistics
   */
         getStats() {
           if (!this.isInitialized) {
             throw new Error('Database not initialized')
           }

           try {
             if (this.useMockDatabase) {
               return {
                 albumCount: this.mockData.albums.length,
                 photoCount: this.mockData.photos.length,
                 version: 1,
                 isInitialized: this.isInitialized,
                 mode: 'mock'
               }
             }

             const albumCount = this.query('SELECT COUNT(*) as count FROM albums')[0].count
             const photoCount = this.query('SELECT COUNT(*) as count FROM photos')[0].count
             const version = this.getCurrentVersion()
             
             return {
               albumCount,
               photoCount,
               version,
               isInitialized: this.isInitialized,
               mode: 'sqlite'
             }
           } catch (error) {
             console.error('Failed to get database stats:', error)
             return {
               albumCount: 0,
               photoCount: 0,
               version: 0,
               isInitialized: false,
               mode: 'error'
             }
           }
         }

         /**
          * Analyze query performance
          * @param {string} sql - SQL query
          * @param {Array} params - Query parameters
          * @returns {Object} Performance analysis
          */
         analyzeQuery(sql, params = []) {
           if (!this.isInitialized) {
             throw new Error('Database not initialized')
           }

           const startTime = performance.now()
           try {
             const result = this.query(sql, params)
             const endTime = performance.now()
             const executionTime = endTime - startTime

             return {
               success: true,
               executionTime,
               resultCount: result.length,
               query: sql,
               params
             }
           } catch (error) {
             const endTime = performance.now()
             const executionTime = endTime - startTime

             return {
               success: false,
               executionTime,
               error: error.message,
               query: sql,
               params
             }
           }
         }

         /**
          * Get database performance statistics
          * @returns {Object} Performance stats
          */
         getPerformanceStats() {
           if (!this.isInitialized) {
             throw new Error('Database not initialized')
           }

           try {
             // Get table sizes
             const albumStats = this.query(`
               SELECT 
                 COUNT(*) as count,
                 MIN(created_date) as oldest,
                 MAX(created_date) as newest
               FROM albums
             `)[0]

             const photoStats = this.query(`
               SELECT 
                 COUNT(*) as count,
                 MIN(added_date) as oldest,
                 MAX(added_date) as newest,
                 AVG(file_size) as avg_size,
                 SUM(file_size) as total_size
               FROM photos
             `)[0]

             // Get index usage (SQLite doesn't provide detailed index stats, so we'll estimate)
             const indexCount = this.query(`
               SELECT COUNT(*) as count 
               FROM sqlite_master 
               WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
             `)[0].count

             return {
               albums: albumStats,
               photos: photoStats,
               indexes: indexCount,
               cacheSize: this.thumbnailCache ? this.thumbnailCache.size : 0
             }
           } catch (error) {
             console.error('Failed to get performance stats:', error)
             return {
               albums: { count: 0 },
               photos: { count: 0 },
               indexes: 0,
               cacheSize: 0
             }
           }
         }

         /**
          * Optimize database (VACUUM and ANALYZE)
          */
         optimize() {
           if (!this.isInitialized) {
             throw new Error('Database not initialized')
           }

           try {
             console.log('Starting database optimization...')
             
             // ANALYZE to update query planner statistics
             this.db.exec('ANALYZE')
             
             // VACUUM to reclaim space and optimize storage
             this.db.exec('VACUUM')
             
             console.log('Database optimization completed')
             return true
           } catch (error) {
             console.error('Database optimization failed:', error)
             return false
           }
         }
}

// Create singleton instance
export const databaseService = new DatabaseService()
