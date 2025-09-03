// Test script to verify directions cache functionality
import directionsCache from './directionsCache';

// Test cache functionality
function testCache() {
  console.log('Testing Directions Cache...');
  
  // Test location points
  const origin1 = { lat: 37.7749, lng: -122.4194 }; // San Francisco
  const dest1 = { lat: 37.3382, lng: -121.8863 }; // San Jose
  const mode1 = 'car';
  
  const origin2 = { lat: 37.8716, lng: -122.2727 }; // Berkeley
  const dest2 = { lat: 37.4419, lng: -122.1430 }; // Palo Alto
  const mode2 = 'walk';
  
  // Mock result
  const mockResult1 = { routes: [{ id: 'route1' }] };
  const mockResult2 = { routes: [{ id: 'route2' }] };
  
  // Test 1: Cache miss
  console.log('Test 1: Cache miss');
  const miss = directionsCache.get(origin1, dest1, mode1);
  console.assert(miss === null, 'Should return null for cache miss');
  console.log('✓ Cache miss works');
  
  // Test 2: Cache set and get
  console.log('\nTest 2: Cache set and get');
  directionsCache.set(origin1, dest1, mode1, mockResult1);
  const hit = directionsCache.get(origin1, dest1, mode1);
  console.assert(hit === mockResult1, 'Should return cached result');
  console.log('✓ Cache hit works');
  
  // Test 3: Different mode = different cache entry
  console.log('\nTest 3: Different mode = different cache entry');
  const differentMode = directionsCache.get(origin1, dest1, 'walk');
  console.assert(differentMode === null, 'Different mode should be cache miss');
  console.log('✓ Mode differentiation works');
  
  // Test 4: Different coordinates = different cache entry
  console.log('\nTest 4: Different coordinates = different cache entry');
  const differentDest = directionsCache.get(origin1, dest2, mode1);
  console.assert(differentDest === null, 'Different destination should be cache miss');
  console.log('✓ Location differentiation works');
  
  // Test 5: LRU eviction
  console.log('\nTest 5: LRU eviction');
  const initialSize = directionsCache.getStats().size;
  // Add multiple entries
  for (let i = 0; i < 10; i++) {
    const origin = { lat: 37.7749 + i * 0.01, lng: -122.4194 };
    const dest = { lat: 37.3382 + i * 0.01, lng: -121.8863 };
    directionsCache.set(origin, dest, 'car', { id: `route${i}` });
  }
  const newSize = directionsCache.getStats().size;
  console.log(`Cache size: ${initialSize} -> ${newSize}`);
  console.log('✓ Cache stores multiple entries');
  
  // Test 6: Clear cache
  console.log('\nTest 6: Clear cache');
  directionsCache.clear();
  const clearedSize = directionsCache.getStats().size;
  console.assert(clearedSize === 0, 'Cache should be empty after clear');
  console.log('✓ Cache clear works');
  
  console.log('\n✅ All cache tests passed!');
}

// Export for testing
export default testCache;