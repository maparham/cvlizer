#!/usr/bin/env node

/**
 * Job Description Test Runner
 *
 * Runs all job description related tests with proper setup and reporting
 */

const { execSync } = require('child_process');
const path = require('path');

const testFiles = [
  'src/__tests__/components/cv/ai/JobDescriptionSummary.test.tsx',
  'src/__tests__/components/cv/ai/JobDescriptionsModal.test.tsx',
  'src/__tests__/stores/aiStore.test.ts',
  'src/__tests__/integration/JobDescriptionFlows.test.tsx',
];

console.log('🧪 Running Job Description Tests...\n');

testFiles.forEach((testFile, index) => {
  console.log(`\n📋 Test ${index + 1}/${testFiles.length}: ${testFile}`);
  console.log('─'.repeat(60));

  try {
    const command = `npm test -- --testPathPattern="${testFile}" --verbose --no-coverage`;
    execSync(command, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', '..')
    });
    console.log(`✅ ${testFile} - PASSED`);
  } catch (error) {
    console.error(`❌ ${testFile} - FAILED`);
    console.error(error.message);
    process.exit(1);
  }
});

console.log('\n🎉 All Job Description Tests Passed!');
console.log('\n📊 Test Summary:');
console.log('├── JobDescriptionSummary Component Tests');
console.log('├── JobDescriptionsModal Component Tests');
console.log('├── AI Store Integration Tests');
console.log('└── Complete User Flow Integration Tests');
console.log('\n✨ Ready for production!');
