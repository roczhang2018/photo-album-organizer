# Photo Album Organizer

一个现代化的照片相册整理应用程序，具有拖拽功能、按周组织和管理功能。

## ✨ 功能特性

- 📸 **照片管理**: 创建、编辑、删除相册
- 📅 **按周组织**: 自动按周分组管理相册
- 🖱️ **拖拽排序**: 支持拖拽重新排序相册
- 💾 **本地存储**: 使用浏览器本地存储保存数据
- 🎨 **现代界面**: 响应式设计，美观易用
- 🔧 **模拟数据库**: 内置模拟数据库，无需外部依赖

## 🚀 快速开始

### 环境要求

- Node.js 16+ 
- npm 或 yarn

### 安装和运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/yaguangzhang/photo-album-organizer.git
   cd photo-album-organizer
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **访问应用**
   - 主应用: http://localhost:3000
   - 测试页面: http://localhost:8080/test.html

## 📦 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run preview` - 预览生产构建

## 🏗️ 项目结构

```
photo-album-organizer/
├── src/
│   ├── components/          # React 组件
│   │   ├── App.js          # 主应用组件
│   │   ├── AlbumGrid.js    # 相册网格组件
│   │   └── AlbumDetail.js  # 相册详情组件
│   ├── services/           # 服务层
│   │   ├── Database.js     # 数据库服务
│   │   ├── AlbumService.js # 相册服务
│   │   ├── PhotoService.js # 照片服务
│   │   └── Router.js       # 路由服务
│   └── utils/              # 工具函数
├── public/                 # 静态资源
├── dist/                   # 构建输出
└── test.html              # 测试页面
```

## 🛠️ 技术栈

- **前端框架**: 原生 JavaScript (ES6+)
- **构建工具**: Vite
- **样式**: CSS3 + 现代布局
- **数据存储**: 浏览器 localStorage + 模拟数据库
- **路由**: 自定义客户端路由

## 📱 主要功能

### 相册管理
- 创建新相册
- 编辑相册名称
- 删除相册
- 按周自动分组

### 照片管理
- 上传照片
- 拖拽排序
- 批量操作
- 预览功能

### 数据持久化
- 本地存储支持
- 数据自动保存
- 离线可用

## 🧪 测试

项目包含多个测试文件：

- `database-test.js` - 数据库功能测试
- `quick-test.js` - 快速功能测试
- `test.html` - 浏览器测试页面

运行测试：
```bash
node database-test.js
node quick-test.js
```

## 🔧 开发说明

### 数据库
项目使用模拟数据库来避免 SQL.js 的复杂性，确保在所有环境下都能稳定运行。

### 路由
使用自定义的路由系统，支持：
- 首页路由 (`/`)
- 相册详情路由 (`/album/:id`)
- 通配符路由 (`*`)

### 状态管理
使用简单的状态管理模式，每个组件管理自己的状态。

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

- GitHub: [@yaguangzhang](https://github.com/yaguangzhang)
- 项目地址: https://github.com/yaguangzhang/photo-album-organizer

---

⭐ 如果这个项目对你有帮助，请给它一个星标！
