#!/usr/bin/env node
/**
 * Comprehensive test runner for the CV Optimizer frontend
 */

const { execSync } = require('child_process');
const path = require('path');

function runCommand(command, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ${description}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    const result = execSync(command, { 
      cwd: path.join(__dirname, '..', 'frontend'),
      stdio: 'inherit',
      encoding: 'utf8'
    });
    return true;
  } catch (error) {
    console.error(`❌ Command failed with exit code ${error.status}`);
    return false;
  }
}

function runTests() {
  console.log('🚀 Starting Comprehensive Test Suite for CV Optimizer Frontend');
  console.log('='.repeat(80));
  
  const testResults = {};
  
  // 1. Run unit tests
  console.log('\n📋 Running Unit Tests...');
  testResults.unit = runCommand('npm test -- --coverage --watchAll=false', 'Unit Tests');
  
  // 2. Run linting
  console.log('\n🔍 Running Code Quality Checks...');
  testResults.linting = runCommand('npm run lint', 'Code Linting');
  
  // 3. Run type checking
  console.log('\n🔬 Running Type Checking...');
  testResults.typeCheck = runCommand('npx tsc --noEmit', 'Type Checking');
  
  // 4. Run build test
  console.log('\n🏗️  Running Build Test...');
  testResults.build = runCommand('npm run build', 'Build Test');
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(Boolean).length;
  
  Object.entries(testResults).forEach(([testType, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${testType.toUpperCase().padEnd(15)} ${status}`);
  });
  
  console.log(`\nOverall: ${passedTests}/${totalTests} test suites passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! The frontend is ready for production.');
    return true;
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} test suite(s) failed. Please check the errors above.`);
    return false;
  }
}

if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests, runCommand };
