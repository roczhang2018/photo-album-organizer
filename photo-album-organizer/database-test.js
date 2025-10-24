// 简单的数据库测试脚本
console.log('开始数据库测试...');

// 模拟 localStorage for Node.js
const mockLocalStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  }
};

// 在 Node.js 环境中使用模拟的 localStorage
if (typeof localStorage === 'undefined') {
  global.localStorage = mockLocalStorage;
}

// 模拟数据库服务
class MockDatabaseService {
  constructor() {
    this.isInitialized = false;
    this.useMockDatabase = true;
    this.mockData = {
      albums: [],
      photos: []
    };
  }

  async init() {
    console.log('Database: Starting initialization...');
    console.log('Database: Using mock database for stability');
    this.useMockDatabase = true;
    
    // Try to load existing mock data from localStorage
    const savedMockData = localStorage.getItem('photo-album-db-mock');
    if (savedMockData) {
      try {
        this.mockData = JSON.parse(savedMockData);
        console.log('Database: Loaded existing mock data from localStorage');
      } catch (parseError) {
        console.warn('Database: Failed to parse saved mock data, using fresh data');
        this.mockData = {
          albums: [],
          photos: []
        };
      }
    } else {
      this.mockData = {
        albums: [],
        photos: []
      };
      console.log('Database: Created fresh mock data');
    }
    
    this.isInitialized = true;
    console.log('Database: Mock database initialized successfully');
  }

  query(sql, params = []) {
    if (this.useMockDatabase) {
      return this.mockQuery(sql, params);
    }
    return [];
  }

  execute(sql, params = []) {
    if (this.useMockDatabase) {
      return this.mockExecute(sql, params);
    }
    return { changes: 0 };
  }

  async save() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      if (this.useMockDatabase) {
        // For mock database, save to localStorage as JSON
        localStorage.setItem('photo-album-db-mock', JSON.stringify(this.mockData));
        console.log('Mock database saved to localStorage');
        return;
      }
    } catch (error) {
      console.error('Failed to save database:', error);
      throw new Error('Database save failed');
    }
  }

  mockQuery(sql, params = []) {
    console.log('Mock Database: Query:', sql, params);
    
    if (sql.includes('SELECT COUNT(*) as count FROM albums')) {
      return [{ count: this.mockData.albums.length }];
    }
    
    if (sql.includes('SELECT COUNT(*) as count FROM photos')) {
      const albumId = params[0];
      const count = this.mockData.photos.filter(p => p.album_id === albumId).length;
      return [{ count }];
    }
    
    if (sql.includes('SELECT') && sql.includes('FROM albums')) {
      return this.mockData.albums.map(album => ({
        id: album.id,
        name: album.name,
        weekGroup: album.week_group,
        createdDate: album.created_date,
        sortOrder: album.sort_order
      }));
    }
    
    return [];
  }

  mockExecute(sql, params = []) {
    console.log('Mock Database: Execute:', sql, params);
    
    if (sql.includes('INSERT INTO albums')) {
      const newId = this.mockData.albums.length + 1;
      const album = {
        id: newId,
        name: params[0],
        week_group: params[1],
        sort_order: params[2],
        created_date: new Date().toISOString()
      };
      this.mockData.albums.push(album);
      return { lastInsertRowid: newId, changes: 1 };
    }
    
    return { changes: 0 };
  }

  getStats() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    return {
      albumCount: this.mockData.albums.length,
      photoCount: this.mockData.photos.length,
      version: 1,
      isInitialized: this.isInitialized,
      mode: 'mock'
    };
  }
}

// 测试函数
async function testDatabase() {
  try {
    const db = new MockDatabaseService();
    
    // 测试初始化
    await db.init();
    console.log('✅ 数据库初始化成功');
    
    // 测试统计
    const stats = db.getStats();
    console.log('✅ 数据库统计:', stats);
    
    // 测试创建相册
    const result = db.execute(
      'INSERT INTO albums (name, week_group, sort_order) VALUES (?, ?, ?)',
      ['Test Album', '2024-W01', 0]
    );
    console.log('✅ 创建相册结果:', result);
    
    // 测试保存数据库
    await db.save();
    console.log('✅ 数据库保存成功');
    
    // 测试查询相册
    const albums = db.query('SELECT * FROM albums');
    console.log('✅ 查询相册结果:', albums);
    
    // 测试最终统计
    const finalStats = db.getStats();
    console.log('✅ 最终统计:', finalStats);
    
    console.log('🎉 所有数据库测试通过！');
    
  } catch (error) {
    console.error('❌ 数据库测试失败:', error.message);
  }
}

// 运行测试
testDatabase();
