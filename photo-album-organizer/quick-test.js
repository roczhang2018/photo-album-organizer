// 快速测试脚本
console.log('开始快速测试...');

// 模拟 localStorage
const mockLocalStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  }
};

if (typeof localStorage === 'undefined') {
  global.localStorage = mockLocalStorage;
}

// 简化的数据库服务
class SimpleDatabaseService {
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
    this.useMockDatabase = true;
    this.mockData = {
      albums: [],
      photos: []
    };
    this.isInitialized = true;
    console.log('Database: Mock database initialized successfully');
  }

  async query(sql, params = []) {
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

  async execute(sql, params = []) {
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

  async save() {
    console.log('Mock database saved');
  }
}

// 简化的相册服务
class SimpleAlbumService {
  constructor(databaseService) {
    this.databaseService = databaseService;
  }

  async getAlbums() {
    console.log('AlbumService: Getting albums...');
    
    const sql = `
      SELECT 
        id,
        name,
        week_group as weekGroup,
        created_date as createdDate,
        sort_order as sortOrder
      FROM albums
      ORDER BY week_group, sort_order
    `;
    
    const albums = await this.databaseService.query(sql, []);
    console.log('AlbumService: Got albums:', albums);
    
    // Get photo count for each album
    for (const album of albums) {
      const photoCountResult = await this.databaseService.query(
        'SELECT COUNT(*) as count FROM photos WHERE album_id = ?',
        [album.id]
      );
      album.photoCount = photoCountResult[0]?.count || 0;
    }
    
    return albums;
  }

  async getAlbumsByWeek() {
    console.log('AlbumService: Getting albums by week...');
    
    const albums = await this.getAlbums();
    const grouped = {};
    
    for (const album of albums) {
      if (!grouped[album.weekGroup]) {
        grouped[album.weekGroup] = [];
      }
      grouped[album.weekGroup].push(album);
    }
    
    console.log('AlbumService: Albums grouped by week:', grouped);
    return grouped;
  }
}

// 测试函数
async function quickTest() {
  try {
    console.log('=== 开始快速测试 ===');
    
    // 初始化数据库
    const db = new SimpleDatabaseService();
    await db.init();
    console.log('✅ 数据库初始化成功');
    
    // 初始化相册服务
    const albumService = new SimpleAlbumService(db);
    console.log('✅ 相册服务初始化成功');
    
    // 测试获取相册
    const albums = await albumService.getAlbums();
    console.log('✅ 获取相册成功:', albums);
    
    // 测试按周分组
    const albumsByWeek = await albumService.getAlbumsByWeek();
    console.log('✅ 按周分组成功:', albumsByWeek);
    
    console.log('🎉 所有测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
quickTest();
