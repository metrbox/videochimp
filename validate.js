#!/usr/bin/env node

/**
 * Validation script to test VideoChimp code structure
 * This validates the application without requiring full infrastructure
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VideoChimp Validation Test\n');
console.log('='.repeat(50));
console.log('');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('✅', name);
    passed++;
  } catch (error) {
    console.log('❌', name);
    console.log('   Error:', error.message);
    failed++;
  }
}

// Test 1: Check all required source files exist
test('All required source files exist', () => {
  const requiredFiles = [
    'src/index.ts',
    'src/app.ts',
    'src/config/index.ts',
    'src/routes/videos.ts',
    'src/services/queue.ts',
    'src/services/video.ts',
    'src/services/tts/index.ts',
    'src/services/tts/openai.ts',
    'src/services/tts/kokoro.ts',
    'src/services/tts/openrouter.ts',
    'src/types/index.ts',
    'src/utils/logger.ts',
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing file: ${file}`);
    }
  }
});

// Test 2: Check TypeScript compiled successfully
test('TypeScript compilation successful', () => {
  const distFiles = [
    'dist/index.js',
    'dist/app.js',
    'dist/config/index.js',
    'dist/routes/videos.js',
  ];

  for (const file of distFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing compiled file: ${file}`);
    }
  }
});

// Test 3: Check package.json has correct dependencies
test('Required dependencies in package.json', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
  );

  const requiredDeps = [
    'express',
    'bullmq',
    'ioredis',
    'axios',
    'openai',
    'fluent-ffmpeg',
    'dotenv',
    'cors',
    'winston',
    'uuid',
  ];

  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep]) {
      throw new Error(`Missing dependency: ${dep}`);
    }
  }
});

// Test 4: Check configuration structure
test('Configuration module structure', () => {
  const config = require('./dist/config/index.js').default;

  if (!config.port) throw new Error('Missing config.port');
  if (!config.redis) throw new Error('Missing config.redis');
  if (!config.tts) throw new Error('Missing config.tts');
  if (!config.storage) throw new Error('Missing config.storage');
  if (!config.apiKeys) throw new Error('Missing config.apiKeys');
});

// Test 5: Check types are properly defined
test('TypeScript types defined', () => {
  const typesFile = fs.readFileSync(
    path.join(__dirname, 'src/types/index.ts'),
    'utf8'
  );

  const requiredTypes = [
    'VideoSegment',
    'VideoGenerationRequest',
    'JobData',
    'TTSProvider',
  ];

  for (const type of requiredTypes) {
    if (!typesFile.includes(type)) {
      throw new Error(`Missing type: ${type}`);
    }
  }
});

// Test 6: Check TTS providers implement required interface
test('TTS provider structure', () => {
  const ttsFiles = ['openai.ts', 'kokoro.ts', 'openrouter.ts'];

  for (const file of ttsFiles) {
    const content = fs.readFileSync(
      path.join(__dirname, 'src/services/tts', file),
      'utf8'
    );

    if (!content.includes('TTSProvider')) {
      throw new Error(`${file} doesn't implement TTSProvider`);
    }

    if (!content.includes('generateSpeech')) {
      throw new Error(`${file} missing generateSpeech method`);
    }
  }
});

// Test 7: Check API routes are properly defined
test('API routes defined', () => {
  const routesContent = fs.readFileSync(
    path.join(__dirname, 'src/routes/videos.ts'),
    'utf8'
  );

  const requiredEndpoints = [
    "post('/generate'",
    "get('/jobs/:jobId'",
    "get('/download/:jobId'",
  ];

  for (const endpoint of requiredEndpoints) {
    if (!routesContent.includes(endpoint)) {
      throw new Error(`Missing endpoint: ${endpoint}`);
    }
  }
});

// Test 8: Check Express app structure
test('Express app configuration', () => {
  const appContent = fs.readFileSync(
    path.join(__dirname, 'src/app.ts'),
    'utf8'
  );

  const requiredMiddleware = ['cors()', 'express.json', '/api/videos'];

  for (const middleware of requiredMiddleware) {
    if (!appContent.includes(middleware)) {
      throw new Error(`Missing middleware/route: ${middleware}`);
    }
  }
});

// Test 9: Check Docker configuration
test('Docker configuration exists', () => {
  const dockerFiles = ['Dockerfile', 'docker-compose.yml'];

  for (const file of dockerFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing file: ${file}`);
    }
  }

  const dockerCompose = fs.readFileSync(
    path.join(__dirname, 'docker-compose.yml'),
    'utf8'
  );

  if (!dockerCompose.includes('redis:')) {
    throw new Error('Docker Compose missing Redis service');
  }
});

// Test 10: Check environment example file
test('Environment configuration template', () => {
  const envExample = fs.readFileSync(
    path.join(__dirname, '.env.example'),
    'utf8'
  );

  const requiredVars = [
    'OPENAI_API_KEY',
    'OPENROUTER_API_KEY',
    'KOKORO_API_KEY',
    'REDIS_HOST',
    'DEFAULT_TTS_PROVIDER',
  ];

  for (const envVar of requiredVars) {
    if (!envExample.includes(envVar)) {
      throw new Error(`Missing env var: ${envVar}`);
    }
  }
});

// Test 11: Check documentation
test('README documentation exists', () => {
  const readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');

  const requiredSections = [
    'Features',
    'Installation',
    'API Endpoints',
    'TTS Provider',
  ];

  for (const section of requiredSections) {
    if (!readme.includes(section)) {
      throw new Error(`README missing section: ${section}`);
    }
  }
});

// Test 12: Check video service methods
test('Video service structure', () => {
  const videoService = fs.readFileSync(
    path.join(__dirname, 'src/services/video.ts'),
    'utf8'
  );

  const requiredMethods = [
    'downloadImage',
    'createVideoSegment',
    'mergeVideoSegments',
    'generateVideo',
  ];

  for (const method of requiredMethods) {
    if (!videoService.includes(method)) {
      throw new Error(`Video service missing method: ${method}`);
    }
  }
});

console.log('');
console.log('='.repeat(50));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ All validation tests passed!');
  console.log('');
  console.log('⚠️  Note: Full functionality requires:');
  console.log('   - Redis server running');
  console.log('   - FFmpeg installed');
  console.log('   - Valid API keys configured');
  console.log('');
  console.log('🐳 To test with full infrastructure, use Docker:');
  console.log('   docker-compose up');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ Some validation tests failed');
  process.exit(1);
}
