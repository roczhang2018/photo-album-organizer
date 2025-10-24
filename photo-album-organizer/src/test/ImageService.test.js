/**
 * Unit tests for Image Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImageService } from '../services/ImageService.js'

describe('ImageService', () => {
  let imageService

  beforeEach(() => {
    imageService = new ImageService()
    vi.clearAllMocks()
  })

  describe('generateThumbnail', () => {
    it('should generate thumbnail from file', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockImage = {
        width: 1000,
        height: 800,
        onload: null,
        onerror: null
      }

      // Mock Image constructor
      global.Image = vi.fn().mockImplementation(() => mockImage)
      
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        result: 'data:image/jpeg;base64,test'
      }
      global.FileReader = vi.fn().mockImplementation(() => mockFileReader)

      // Mock canvas
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        }),
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,thumbnail')
      }
      global.HTMLCanvasElement = vi.fn().mockImplementation(() => mockCanvas)

      const result = await imageService.generateThumbnail(mockFile)

      expect(result).toBe('data:image/jpeg;base64,thumbnail')
      expect(mockCanvas.width).toBe(200) // maxSize default
      expect(mockCanvas.height).toBe(160) // calculated from aspect ratio
    })

    it('should use cached thumbnail when available', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const cachedThumbnail = 'data:image/jpeg;base64,cached'
      
      // Add to cache
      imageService.thumbnailCache.set('test.jpg-123-200-0.8-image/jpeg', {
        value: cachedThumbnail,
        expiry: Date.now() + 60000
      })

      const result = await imageService.generateThumbnail(mockFile)

      expect(result).toBe(cachedThumbnail)
    })

    it('should handle image loading errors', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockImage = {
        onload: null,
        onerror: null
      }

      global.Image = vi.fn().mockImplementation(() => mockImage)
      
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        onerror: null
      }
      global.FileReader = vi.fn().mockImplementation(() => mockFileReader)

      // Simulate error
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror(new Error('Load failed'))
      }, 0)

      await expect(imageService.generateThumbnail(mockFile))
        .rejects.toThrow('Thumbnail generation failed')
    })
  })

  describe('calculateThumbnailDimensions', () => {
    it('should maintain aspect ratio for landscape images', () => {
      const dimensions = imageService.calculateThumbnailDimensions(1000, 500, 200)
      expect(dimensions).toEqual({ width: 200, height: 100 })
    })

    it('should maintain aspect ratio for portrait images', () => {
      const dimensions = imageService.calculateThumbnailDimensions(500, 1000, 200)
      expect(dimensions).toEqual({ width: 100, height: 200 })
    })

    it('should return original dimensions for small images', () => {
      const dimensions = imageService.calculateThumbnailDimensions(100, 80, 200)
      expect(dimensions).toEqual({ width: 100, height: 80 })
    })

    it('should handle square images', () => {
      const dimensions = imageService.calculateThumbnailDimensions(1000, 1000, 200)
      expect(dimensions).toEqual({ width: 200, height: 200 })
    })
  })

  describe('detectImageFormat', () => {
    it('should detect format from MIME type', () => {
      const jpegFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const pngFile = new File(['test'], 'test.png', { type: 'image/png' })
      const webpFile = new File(['test'], 'test.webp', { type: 'image/webp' })

      expect(imageService.detectImageFormat(jpegFile)).toBe('image/jpeg')
      expect(imageService.detectImageFormat(pngFile)).toBe('image/png')
      expect(imageService.detectImageFormat(webpFile)).toBe('image/webp')
    })

    it('should detect format from file extension', () => {
      const jpegFile = new File(['test'], 'test.jpg', { type: 'application/octet-stream' })
      const pngFile = new File(['test'], 'test.png', { type: 'application/octet-stream' })
      const gifFile = new File(['test'], 'test.gif', { type: 'application/octet-stream' })

      expect(imageService.detectImageFormat(jpegFile)).toBe('image/jpeg')
      expect(imageService.detectImageFormat(pngFile)).toBe('image/png')
      expect(imageService.detectImageFormat(gifFile)).toBe('image/gif')
    })

    it('should return unknown for unsupported formats', () => {
      const unknownFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      expect(imageService.detectImageFormat(unknownFile)).toBe('unknown')
    })

    it('should handle files without type', () => {
      const noTypeFile = { name: 'test.jpg' }
      expect(imageService.detectImageFormat(noTypeFile)).toBe('image/jpeg')
    })
  })

  describe('validateImageFile', () => {
    it('should validate correct image file', () => {
      const validFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const result = imageService.validateImageFile(validFile)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject unsupported formats', () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const result = imageService.validateImageFile(invalidFile)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Unsupported image format')
    })

    it('should reject files that are too large', () => {
      const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const result = imageService.validateImageFile(largeFile)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File too large (max 50MB)')
    })

    it('should reject empty files', () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' })
      const result = imageService.validateImageFile(emptyFile)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File is empty')
    })

    it('should warn about large files', () => {
      const largeFile = new File(['x'.repeat(15 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const result = imageService.validateImageFile(largeFile)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Large file may take time to process')
    })

    it('should handle null file', () => {
      const result = imageService.validateImageFile(null)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('No file provided')
    })
  })

  describe('setupLazyLoading', () => {
    it('should setup intersection observer', () => {
      const mockContainer = {
        querySelectorAll: vi.fn().mockReturnValue([
          { dataset: { lazy: true } },
          { dataset: { lazy: true } }
        ])
      }

      const mockObserver = {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn()
      }

      global.IntersectionObserver = vi.fn().mockImplementation(() => mockObserver)

      imageService.setupLazyLoading(mockContainer, vi.fn())

      expect(global.IntersectionObserver).toHaveBeenCalled()
      expect(mockObserver.observe).toHaveBeenCalledTimes(2)
    })

    it('should fallback for browsers without IntersectionObserver', () => {
      const mockContainer = { querySelectorAll: vi.fn() }
      const loadCallback = vi.fn()

      // Remove IntersectionObserver
      delete global.IntersectionObserver

      imageService.setupLazyLoading(mockContainer, loadCallback)

      expect(loadCallback).toHaveBeenCalled()
    })
  })

  describe('optimizeImage', () => {
    it('should optimize large images', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockImage = {
        width: 3000,
        height: 2000,
        onload: null,
        onerror: null
      }

      global.Image = vi.fn().mockImplementation(() => mockImage)
      
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        result: 'data:image/jpeg;base64,test'
      }
      global.FileReader = vi.fn().mockImplementation(() => mockFileReader)

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        }),
        toBlob: vi.fn().mockImplementation((callback) => {
          callback(new Blob(['optimized'], { type: 'image/jpeg' }))
        })
      }
      global.HTMLCanvasElement = vi.fn().mockImplementation(() => mockCanvas)

      const result = await imageService.optimizeImage(mockFile, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8
      })

      expect(result).toBeInstanceOf(Blob)
      expect(mockCanvas.width).toBe(1920)
      expect(mockCanvas.height).toBe(1280) // Maintained aspect ratio
    })

    it('should return original file for small images', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      const mockImage = {
        width: 800,
        height: 600,
        onload: null,
        onerror: null
      }

      global.Image = vi.fn().mockImplementation(() => mockImage)
      
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        result: 'data:image/jpeg;base64,test'
      }
      global.FileReader = vi.fn().mockImplementation(() => mockFileReader)

      const result = await imageService.optimizeImage(mockFile, {
        maxWidth: 1920,
        maxHeight: 1080
      })

      expect(result).toBe(mockFile)
    })
  })

  describe('getImageMetadata', () => {
    it('should extract image metadata', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      mockFile.lastModified = 1234567890
      mockFile.size = 1024000

      const mockImage = {
        width: 1920,
        height: 1080,
        onload: null,
        onerror: null
      }

      global.Image = vi.fn().mockImplementation(() => mockImage)
      
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        result: 'data:image/jpeg;base64,test'
      }
      global.FileReader = vi.fn().mockImplementation(() => mockFileReader)

      const result = await imageService.getImageMetadata(mockFile)

      expect(result).toEqual({
        width: 1920,
        height: 1080,
        aspectRatio: 1920 / 1080,
        format: 'image/jpeg',
        size: 1024000,
        lastModified: 1234567890
      })
    })
  })

  describe('cache management', () => {
    it('should clear cache', () => {
      imageService.thumbnailCache.set('key1', 'value1')
      imageService.thumbnailCache.set('key2', 'value2')

      imageService.clearCache()

      expect(imageService.thumbnailCache.size).toBe(0)
    })

    it('should clear cache with pattern', () => {
      imageService.thumbnailCache.set('album1-photo1', 'value1')
      imageService.thumbnailCache.set('album1-photo2', 'value2')
      imageService.thumbnailCache.set('album2-photo1', 'value3')

      imageService.clearCache('album1')

      expect(imageService.thumbnailCache.size).toBe(1)
      expect(imageService.thumbnailCache.has('album2-photo1')).toBe(true)
    })

    it('should get cache statistics', () => {
      imageService.thumbnailCache.set('key1', 'value1')
      imageService.thumbnailCache.set('key2', 'value2')

      const stats = imageService.getCacheStats()

      expect(stats).toEqual({
        size: 2,
        maxSize: 200,
        quality: 0.8
      })
    })
  })
})
