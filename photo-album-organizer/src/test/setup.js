/**
 * Test setup file for Vitest
 * Configures global test environment and mocks
 */

import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now())
  }
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock File System Access API
Object.defineProperty(window, 'showOpenFilePicker', {
  value: vi.fn()
})

Object.defineProperty(window, 'showSaveFilePicker', {
  value: vi.fn()
})

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(),
  readAsText: vi.fn(),
  readAsArrayBuffer: vi.fn(),
  onload: null,
  onerror: null,
  result: null
}))

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 100 }),
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high'
})

HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mock')
HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback) => {
  callback(new Blob(['mock'], { type: 'image/png' }))
})

// Mock Image constructor
global.Image = vi.fn().mockImplementation(() => ({
  src: '',
  onload: null,
  onerror: null,
  width: 100,
  height: 100
}))

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})
