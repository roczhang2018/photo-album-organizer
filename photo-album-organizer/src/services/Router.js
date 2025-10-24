/**
 * Router Service
 * Handles client-side routing using History API
 */
export class Router {
  constructor() {
    this.routes = new Map()
    this.currentRoute = null
    this.beforeRouteChange = null
    this.afterRouteChange = null
  }

  /**
   * Initialize the router
   */
  init() {
    // Listen for browser navigation events
    window.addEventListener('popstate', (event) => {
      this.handleRouteChange()
    })

    // Handle initial route
    this.handleRouteChange()
  }

  /**
   * Add a route
   * @param {string} path - Route path (supports parameters like /album/:id)
   * @param {Function} handler - Route handler function
   * @param {Object} options - Route options
   */
  addRoute(path, handler, options = {}) {
    const route = {
      path,
      handler,
      pattern: this.pathToRegex(path),
      params: this.extractParams(path),
      ...options
    }
    
    this.routes.set(path, route)
  }

  /**
   * Navigate to a route
   * @param {string} path - Path to navigate to
   * @param {Object} state - Optional state to pass
   */
  navigate(path, state = {}) {
    if (this.beforeRouteChange) {
      const result = this.beforeRouteChange(this.currentRoute, path)
      if (result === false) {
        return false
      }
    }

    // Update URL without triggering page reload
    window.history.pushState(state, '', path)
    this.handleRouteChange()
    
    if (this.afterRouteChange) {
      this.afterRouteChange(this.currentRoute, path)
    }
    
    return true
  }

  /**
   * Replace current route
   * @param {string} path - Path to navigate to
   * @param {Object} state - Optional state to pass
   */
  replace(path, state = {}) {
    if (this.beforeRouteChange) {
      const result = this.beforeRouteChange(this.currentRoute, path)
      if (result === false) {
        return false
      }
    }

    window.history.replaceState(state, '', path)
    this.handleRouteChange()
    
    if (this.afterRouteChange) {
      this.afterRouteChange(this.currentRoute, path)
    }
    
    return true
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back()
  }

  /**
   * Go forward in history
   */
  forward() {
    window.history.forward()
  }

  /**
   * Get current route information
   * @returns {Object} Current route info
   */
  getCurrentRoute() {
    return this.currentRoute
  }

  /**
   * Get current path
   * @returns {string} Current path
   */
  getCurrentPath() {
    return window.location.pathname
  }

  /**
   * Handle route changes
   */
  handleRouteChange() {
    const path = this.getCurrentPath()
    const route = this.matchRoute(path)
    
    if (route) {
      this.currentRoute = {
        path: route.path,
        params: route.params,
        query: this.parseQuery(window.location.search),
        hash: window.location.hash,
        fullPath: path
      }
      
      // Call route handler
      route.handler(this.currentRoute)
    } else {
      // Handle 404
      this.handle404(path)
    }
  }

  /**
   * Match a path against registered routes
   * @param {string} path - Path to match
   * @returns {Object|null} Matched route or null
   */
  matchRoute(path) {
    for (const route of this.routes.values()) {
      const match = path.match(route.pattern)
      if (match) {
        const params = {}
        
        // Extract parameters
        route.params.forEach((param, index) => {
          params[param] = match[index + 1]
        })
        
        return {
          ...route,
          params
        }
      }
    }
    
    return null
  }

  /**
   * Convert route path to regex pattern
   * @param {string} path - Route path
   * @returns {RegExp} Regex pattern
   */
  pathToRegex(path) {
    // Handle wildcard route
    if (path === '*') {
      return new RegExp('^.*$')
    }
    
    const escaped = path
      .replace(/\//g, '\\/')
      .replace(/:([^\/]+)/g, '([^/]+)')
    
    return new RegExp(`^${escaped}$`)
  }

  /**
   * Extract parameter names from route path
   * @param {string} path - Route path
   * @returns {Array<string>} Parameter names
   */
  extractParams(path) {
    const matches = path.match(/:([^\/]+)/g)
    return matches ? matches.map(match => match.slice(1)) : []
  }

  /**
   * Parse query string
   * @param {string} search - Query string
   * @returns {Object} Parsed query parameters
   */
  parseQuery(search) {
    const params = {}
    if (search) {
      const queryString = search.slice(1) // Remove '?'
      const pairs = queryString.split('&')
      
      for (const pair of pairs) {
        const [key, value] = pair.split('=')
        if (key) {
          params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ''
        }
      }
    }
    
    return params
  }

  /**
   * Handle 404 errors
   * @param {string} path - Path that caused 404
   */
  handle404(path) {
    this.currentRoute = {
      path: null,
      params: {},
      query: this.parseQuery(window.location.search),
      hash: window.location.hash,
      fullPath: path,
      is404: true
    }
    
    // Call 404 handler if registered
    const notFoundRoute = this.routes.get('*')
    if (notFoundRoute) {
      notFoundRoute.handler(this.currentRoute)
    } else {
      console.warn(`No route found for path: ${path}`)
    }
  }

  /**
   * Set before route change hook
   * @param {Function} hook - Hook function
   */
  setBeforeRouteChange(hook) {
    this.beforeRouteChange = hook
  }

  /**
   * Set after route change hook
   * @param {Function} hook - Hook function
   */
  setAfterRouteChange(hook) {
    this.afterRouteChange = hook
  }

  /**
   * Get all registered routes
   * @returns {Array} Array of route objects
   */
  getRoutes() {
    return Array.from(this.routes.values())
  }

  /**
   * Check if a path matches any route
   * @param {string} path - Path to check
   * @returns {boolean} True if path matches a route
   */
  hasRoute(path) {
    return this.matchRoute(path) !== null
  }

  /**
   * Generate URL for a route with parameters
   * @param {string} routePath - Route path template
   * @param {Object} params - Parameters to substitute
   * @returns {string} Generated URL
   */
  generateUrl(routePath, params = {}) {
    let url = routePath
    
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, encodeURIComponent(value))
    }
    
    return url
  }
}

// Create singleton instance
export const router = new Router()
