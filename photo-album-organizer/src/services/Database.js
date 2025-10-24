/**
 * Database Service
 * Handles SQLite database operations using sql.js
 */
export class DatabaseService {
  constructor() {
    this.db = null
    this.isInitialized = false
  }

  /**
   * Initialize the database
   * @returns {Promise<void>}
   */
  async init() {
    try {
      // Import sql.js dynamically with proper configuration
      const initSqlJs = await import('sql.js')
      
      // Configure SQL.js with proper WASM loading
      const config = {
        locateFile: (file) => {
          if (file.endsWith('.wasm')) {
            return `https://sql.js.org/dist/${file}`
          }
          return file
        }
      }
      
      const SQL = await initSqlJs.default(config)
      
      // Create or load database
      const savedDb = localStorage.getItem('photo-album-db')
      if (savedDb) {
        // Load existing database
        const data = new Uint8Array(JSON.parse(savedDb))
        this.db = new SQL.Database(data)
      } else {
        // Create new database
        this.db = new SQL.Database()
        await this.createTables()
      }
      
      this.isInitialized = true
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database:', error)
      // Fallback: try without external WASM
      try {
        const initSqlJs = await import('sql.js')
        const SQL = await initSqlJs.default()
        
        const savedDb = localStorage.getItem('photo-album-db')
        if (savedDb) {
          const data = new Uint8Array(JSON.parse(savedDb))
          this.db = new SQL.Database(data)
        } else {
          this.db = new SQL.Database()
          await this.createTables()
        }
        
        this.isInitialized = true
        console.log('Database initialized successfully (fallback mode)')
      } catch (fallbackError) {
        console.error('Fallback database initialization also failed:', fallbackError)
        throw new Error('Database initialization failed completely')
      }
    }
  }

  /**
   * Create database tables
   * @returns {Promise<void>}
   */
  async createTables() {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      // Create albums table with validation
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
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
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
   * @returns {Array} Query results
   */
  query(sql, params = []) {
    if (!this.db) {
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
   * @returns {Object} Execution result
   */
  execute(sql, params = []) {
    if (!this.db) {
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
   * Begin a transaction
   */
  beginTransaction() {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    this.db.exec('BEGIN TRANSACTION')
  }

  /**
   * Commit a transaction
   */
  commitTransaction() {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    this.db.exec('COMMIT')
  }

  /**
   * Rollback a transaction
   */
  rollbackTransaction() {
    if (!this.db) {
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
           if (!this.db) {
             throw new Error('Database not initialized')
           }

           try {
             const albumCount = this.query('SELECT COUNT(*) as count FROM albums')[0].count
             const photoCount = this.query('SELECT COUNT(*) as count FROM photos')[0].count
             const version = this.getCurrentVersion()
             
             return {
               albumCount,
               photoCount,
               version,
               isInitialized: this.isInitialized
             }
           } catch (error) {
             console.error('Failed to get database stats:', error)
             return {
               albumCount: 0,
               photoCount: 0,
               version: 0,
               isInitialized: false
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
           if (!this.db) {
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
           if (!this.db) {
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
           if (!this.db) {
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
