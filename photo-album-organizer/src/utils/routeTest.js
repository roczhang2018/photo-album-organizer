/**
 * Route Testing Utilities
 * Simple tests to verify routing functionality
 */

/**
 * Test basic routing functionality
 */
export function testRouting() {
  console.log('🧪 Testing routing functionality...')
  
  const tests = [
    {
      name: 'Home route navigation',
      test: () => {
        window.app.navigate('/')
        return window.location.pathname === '/'
      }
    },
    {
      name: 'Album route navigation',
      test: () => {
        window.app.navigate('/album/1')
        return window.location.pathname === '/album/1'
      }
    },
    {
      name: '404 route handling',
      test: () => {
        window.app.navigate('/nonexistent')
        return window.location.pathname === '/nonexistent'
      }
    },
    {
      name: 'Browser back navigation',
      test: () => {
        window.app.navigate('/album/2')
        window.history.back()
        return window.location.pathname === '/nonexistent'
      }
    }
  ]
  
  let passed = 0
  let failed = 0
  
  tests.forEach(({ name, test }) => {
    try {
      const result = test()
      if (result) {
        console.log(`✅ ${name}`)
        passed++
      } else {
        console.log(`❌ ${name}`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`)
      failed++
    }
  })
  
  console.log(`\n📊 Routing tests: ${passed} passed, ${failed} failed`)
  
  // Reset to home
  window.app.navigate('/')
  
  return { passed, failed, total: tests.length }
}

/**
 * Test route parameter parsing
 */
export function testRouteParameters() {
  console.log('🧪 Testing route parameters...')
  
  const router = window.app.router || window.router
  
  if (!router) {
    console.log('❌ Router not available')
    return false
  }
  
  // Test parameter extraction
  const testRoute = router.matchRoute('/album/123')
  if (testRoute && testRoute.params.id === '123') {
    console.log('✅ Route parameter parsing')
    return true
  } else {
    console.log('❌ Route parameter parsing failed')
    return false
  }
}

/**
 * Run all routing tests
 */
export function runAllRoutingTests() {
  console.log('🚀 Running all routing tests...\n')
  
  const routeTest = testRouting()
  const paramTest = testRouteParameters()
  
  const totalPassed = routeTest.passed + (paramTest ? 1 : 0)
  const totalTests = routeTest.total + 1
  
  console.log(`\n🎯 Overall routing tests: ${totalPassed}/${totalTests} passed`)
  
  return totalPassed === totalTests
}

// Make tests available globally for console testing
if (typeof window !== 'undefined') {
  window.routeTests = {
    testRouting,
    testRouteParameters,
    runAllRoutingTests
  }
}
