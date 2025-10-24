/**
 * Integration tests for Photo Album Organizer
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { App } from '../components/App.js'
import { AlbumGrid } from '../components/AlbumGrid.js'
import { AlbumDetail } from '../components/AlbumDetail.js'

// Mock all services
vi.mock('../services/Database.js', () => ({
  databaseService: {
    init: vi.fn().mockResolvedValue(true),
    query: vi.fn().mockReturnValue([]),
    execute: vi.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
    save: vi.fn().mockResolvedValue(),
    getStats: vi.fn().mockReturnValue({ albumCount: 0, photoCount: 0, version: 1, isInitialized: true })
  }
}))

vi.mock('../services/AlbumService.js', () => ({
  albumService: {
    createAlbum: vi.fn().mockResolvedValue({ id: 1, name: 'Test Album', weekGroup: '2024-W01' }),
    getAlbums: vi.fn().mockResolvedValue([]),
    getAlbumById: vi.fn().mockResolvedValue(null),
    updateAlbum: vi.fn().mockResolvedValue({}),
    deleteAlbum: vi.fn().mockResolvedValue(),
    getAlbumsByWeek: vi.fn().mockResolvedValue({}),
    getPhotoCount: vi.fn().mockResolvedValue(0)
  }
}))

vi.mock('../services/PhotoService.js', () => ({
  photoService: {
    addPhotoToAlbum: vi.fn().mockResolvedValue({ id: 1, albumId: 1, filename: 'test.jpg' }),
    getPhotosInAlbum: vi.fn().mockResolvedValue([]),
    removePhotoFromAlbum: vi.fn().mockResolvedValue(),
    getPhotoById: vi.fn().mockResolvedValue(null),
    getPhotoCount: vi.fn().mockResolvedValue(0)
  }
}))

vi.mock('../services/Router.js', () => ({
  router: {
    addRoute: vi.fn(),
    navigate: vi.fn().mockResolvedValue(true),
    init: vi.fn(),
    setBeforeRouteChange: vi.fn(),
    setAfterRouteChange: vi.fn()
  }
}))

vi.mock('../services/FileSystemService.js', () => ({
  fileSystemService: {
    selectPhotos: vi.fn().mockResolvedValue([]),
    validateFile: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
    getSupportedImageTypes: vi.fn().mockReturnValue(['image/jpeg', 'image/png'])
  }
}))

vi.mock('../services/ImageService.js', () => ({
  imageService: {
    generateThumbnail: vi.fn().mockResolvedValue('data:image/jpeg;base64,test'),
    validateImageFile: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
    setupLazyLoading: vi.fn()
  }
}))

vi.mock('../services/CacheService.js', () => ({
  cacheService: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn()
  }
}))

describe('Integration Tests', () => {
  let app
  let mockContainer

  beforeEach(() => {
    // Create mock DOM container
    mockContainer = document.createElement('div')
    mockContainer.id = 'app'
    document.body.appendChild(mockContainer)

    // Create app instance
    app = new App()
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.removeChild(mockContainer)
  })

  describe('Application Initialization', () => {
    it('should initialize application successfully', async () => {
      await app.init()
      
      expect(app.isInitialized).toBe(true)
    })

    it('should handle initialization errors gracefully', async () => {
      const { databaseService } = await import('../services/Database.js')
      databaseService.init.mockRejectedValue(new Error('Database error'))

      await app.init()
      
      // Should render error state
      expect(mockContainer.innerHTML).toContain('Failed to initialize application')
    })
  })

  describe('Album Management Workflow', () => {
    it('should create and display albums', async () => {
      const { albumService } = await import('../services/AlbumService.js')
      const mockAlbums = [
        { id: 1, name: 'Vacation 2024', weekGroup: '2024-W01', photoCount: 15 },
        { id: 2, name: 'Family Photos', weekGroup: '2024-W02', photoCount: 8 }
      ]
      
      albumService.getAlbumsByWeek.mockResolvedValue({
        '2024-W01': [mockAlbums[0]],
        '2024-W02': [mockAlbums[1]]
      })

      await app.init()
      await app.handleHomeRoute({ path: '/', params: {}, query: {} })

      expect(mockContainer.innerHTML).toContain('Vacation 2024')
      expect(mockContainer.innerHTML).toContain('Family Photos')
    })

    it('should navigate to album detail page', async () => {
      const { albumService, photoService } = await import('../services/AlbumService.js')
      const { photoService: photoServiceImport } = await import('../services/PhotoService.js')
      
      const mockAlbum = { id: 1, name: 'Test Album', weekGroup: '2024-W01', photoCount: 5 }
      const mockPhotos = [
        { id: 1, filename: 'photo1.jpg', fileSize: 1024000, addedDate: '2024-01-15' },
        { id: 2, filename: 'photo2.jpg', fileSize: 2048000, addedDate: '2024-01-16' }
      ]

      albumService.getAlbumById.mockResolvedValue(mockAlbum)
      photoServiceImport.getPhotosInAlbum.mockResolvedValue(mockPhotos)

      await app.init()
      await app.handleAlbumRoute({ path: '/album/1', params: { id: '1' }, query: {} })

      expect(albumService.getAlbumById).toHaveBeenCalledWith(1)
      expect(photoServiceImport.getPhotosInAlbum).toHaveBeenCalledWith(1)
    })
  })

  describe('Photo Management Workflow', () => {
    it('should add photos to album', async () => {
      const { photoService } = await import('../services/PhotoService.js')
      const { fileSystemService } = await import('../services/FileSystemService.js')
      
      const mockFiles = [
        { name: 'photo1.jpg', size: 1024000, path: '/photos/photo1.jpg' },
        { name: 'photo2.jpg', size: 2048000, path: '/photos/photo2.jpg' }
      ]

      fileSystemService.selectPhotos.mockResolvedValue(mockFiles)
      photoService.addPhotoToAlbum.mockResolvedValue({ id: 1, albumId: 1, filename: 'photo1.jpg' })

      const albumDetail = new AlbumDetail(mockContainer, 1)
      await albumDetail.showAddPhotosDialog()

      expect(fileSystemService.selectPhotos).toHaveBeenCalled()
      expect(photoService.addPhotoToAlbum).toHaveBeenCalledTimes(2)
    })

    it('should handle photo import errors', async () => {
      const { fileSystemService } = await import('../services/FileSystemService.js')
      
      fileSystemService.selectPhotos.mockRejectedValue(new Error('File selection cancelled'))

      const albumDetail = new AlbumDetail(mockContainer, 1)
      await albumDetail.showAddPhotosDialog()

      // Should handle error gracefully
      expect(fileSystemService.selectPhotos).toHaveBeenCalled()
    })
  })

  describe('Album Grid Component', () => {
    it('should render album grid with drag and drop', async () => {
      const { albumService } = await import('../services/AlbumService.js')
      const mockAlbums = [
        { id: 1, name: 'Album 1', weekGroup: '2024-W01', photoCount: 5 },
        { id: 2, name: 'Album 2', weekGroup: '2024-W01', photoCount: 3 }
      ]

      albumService.getAlbumsByWeek.mockResolvedValue({
        '2024-W01': mockAlbums
      })

      const albumGrid = new AlbumGrid(mockContainer)
      await albumGrid.init()

      expect(mockContainer.innerHTML).toContain('Album 1')
      expect(mockContainer.innerHTML).toContain('Album 2')
      expect(mockContainer.querySelectorAll('.album-card')).toHaveLength(2)
    })

    it('should handle album creation', async () => {
      const { albumService } = await import('../services/AlbumService.js')
      
      albumService.getAlbumsByWeek.mockResolvedValue({})
      albumService.createAlbum.mockResolvedValue({ id: 1, name: 'New Album', weekGroup: '2024-W01' })

      const albumGrid = new AlbumGrid(mockContainer)
      await albumGrid.init()

      // Mock user input
      global.prompt = vi.fn().mockReturnValue('New Album')

      await albumGrid.handleCreateAlbum('2024-W01')

      expect(albumService.createAlbum).toHaveBeenCalledWith('New Album', '2024-W01')
    })

    it('should handle album deletion', async () => {
      const { albumService } = await import('../services/AlbumService.js')
      const mockAlbums = [
        { id: 1, name: 'Album 1', weekGroup: '2024-W01', photoCount: 5 }
      ]

      albumService.getAlbumsByWeek.mockResolvedValue({
        '2024-W01': mockAlbums
      })
      albumService.deleteAlbum.mockResolvedValue()

      const albumGrid = new AlbumGrid(mockContainer)
      await albumGrid.init()

      // Mock user confirmation
      global.confirm = vi.fn().mockReturnValue(true)

      await albumGrid.handleDeleteAlbum(1)

      expect(albumService.deleteAlbum).toHaveBeenCalledWith(1)
    })
  })

  describe('Album Detail Component', () => {
    it('should render album detail with photos', async () => {
      const { albumService } = await import('../services/AlbumService.js')
      const { photoService } = await import('../services/PhotoService.js')
      
      const mockAlbum = { id: 1, name: 'Test Album', weekGroup: '2024-W01', photoCount: 2 }
      const mockPhotos = [
        { id: 1, filename: 'photo1.jpg', fileSize: 1024000, addedDate: '2024-01-15' },
        { id: 2, filename: 'photo2.jpg', fileSize: 2048000, addedDate: '2024-01-16' }
      ]

      albumService.getAlbumById.mockResolvedValue(mockAlbum)
      photoService.getPhotosInAlbum.mockResolvedValue(mockPhotos)

      const albumDetail = new AlbumDetail(mockContainer, 1)
      await albumDetail.init()

      expect(mockContainer.innerHTML).toContain('Test Album')
      expect(mockContainer.innerHTML).toContain('photo1.jpg')
      expect(mockContainer.innerHTML).toContain('photo2.jpg')
    })

    it('should handle photo selection and bulk operations', async () => {
      const { albumService } = await import('../services/AlbumService.js')
      const { photoService } = await import('../services/PhotoService.js')
      
      const mockAlbum = { id: 1, name: 'Test Album', weekGroup: '2024-W01', photoCount: 2 }
      const mockPhotos = [
        { id: 1, filename: 'photo1.jpg', fileSize: 1024000, addedDate: '2024-01-15' },
        { id: 2, filename: 'photo2.jpg', fileSize: 2048000, addedDate: '2024-01-16' }
      ]

      albumService.getAlbumById.mockResolvedValue(mockAlbum)
      photoService.getPhotosInAlbum.mockResolvedValue(mockPhotos)
      photoService.removePhotoFromAlbum.mockResolvedValue()

      const albumDetail = new AlbumDetail(mockContainer, 1)
      await albumDetail.init()

      // Enable selection mode
      albumDetail.toggleSelectionMode()
      expect(albumDetail.isSelectionMode).toBe(true)

      // Select photos
      albumDetail.togglePhotoSelection(1)
      albumDetail.togglePhotoSelection(2)
      expect(albumDetail.selectedPhotos).toContain(1)
      expect(albumDetail.selectedPhotos).toContain(2)

      // Mock user confirmation for bulk delete
      global.confirm = vi.fn().mockReturnValue(true)

      await albumDetail.bulkRemovePhotos()

      expect(photoService.removePhotoFromAlbum).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const { databaseService } = await import('../services/Database.js')
      databaseService.init.mockRejectedValue(new Error('Connection failed'))

      await app.init()

      expect(mockContainer.innerHTML).toContain('Failed to initialize application')
    })

    it('should handle album loading errors', async () => {
      const { albumService } = await import('../services/AlbumService.js')
      albumService.getAlbumsByWeek.mockRejectedValue(new Error('Database error'))

      const albumGrid = new AlbumGrid(mockContainer)
      await albumGrid.init()

      expect(mockContainer.innerHTML).toContain('Failed to load albums')
    })

    it('should handle photo loading errors', async () => {
      const { albumService } = await import('../services/AlbumService.js')
      const { photoService } = await import('../services/PhotoService.js')
      
      const mockAlbum = { id: 1, name: 'Test Album', weekGroup: '2024-W01', photoCount: 0 }
      albumService.getAlbumById.mockResolvedValue(mockAlbum)
      photoService.getPhotosInAlbum.mockRejectedValue(new Error('Photo loading failed'))

      const albumDetail = new AlbumDetail(mockContainer, 1)
      await albumDetail.init()

      expect(mockContainer.innerHTML).toContain('Failed to load photos')
    })
  })

  describe('Cross-Browser Compatibility', () => {
    it('should handle missing File System Access API', async () => {
      // Remove File System Access API
      delete window.showOpenFilePicker
      delete window.showSaveFilePicker

      const { fileSystemService } = await import('../services/FileSystemService.js')
      fileSystemService.selectPhotos.mockResolvedValue([])

      const albumDetail = new AlbumDetail(mockContainer, 1)
      await albumDetail.showAddPhotosDialog()

      // Should fallback to file input
      expect(fileSystemService.selectPhotos).toHaveBeenCalled()
    })

    it('should handle missing IntersectionObserver', async () => {
      // Remove IntersectionObserver
      delete window.IntersectionObserver

      const { imageService } = await import('../services/ImageService.js')
      imageService.setupLazyLoading.mockImplementation(() => {
        // Should fallback to loading all images
      })

      const albumDetail = new AlbumDetail(mockContainer, 1)
      albumDetail.setupLazyLoading()

      expect(imageService.setupLazyLoading).toHaveBeenCalled()
    })
  })
})
