#!/usr/bin/env node
/**
 * Quick test to verify Playwright setup is working correctly
 */

const { execSync } = require('child_process');
const path = require('path');

function runCommand(command, description) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🧪 ${description}`);
  console.log(`${'='.repeat(50)}`);
  
  try {
    const result = execSync(command, { 
      cwd: __dirname,
      stdio: 'inherit',
      encoding: 'utf8'
    });
    console.log(`✅ ${description} - PASSED`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - FAILED with exit code ${error.status}`);
    return false;
  }
}

function testPlaywrightSetup() {
  console.log('🚀 Testing Playwright Setup');
  console.log('='.repeat(60));
  
  const results = {};
  
  // Test 1: Check if Playwright is installed
  console.log('\n📦 Checking Playwright Installation...');
  results.installation = runCommand('npx playwright --version', 'Playwright Installation Check');
  
  // Test 2: Validate configuration
  console.log('\n⚙️  Validating Configuration...');
  results.config = runCommand('npx playwright test --list', 'Configuration Validation');
  
  // Test 3: Run smoke tests only (quick verification)
  console.log('\n💨 Running Smoke Tests...');
  results.smokeTests = runCommand('npx playwright test smoke.spec.ts --headed', 'Smoke Tests');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 PLAYWRIGHT SETUP TEST SUMMARY');
  console.log('='.repeat(60));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  Object.entries(results).forEach(([testType, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${testType.toUpperCase().padEnd(20)} ${status}`);
  });
  
  console.log(`\nOverall: ${passedTests}/${totalTests} checks passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 Playwright setup is working correctly!');
    console.log('\nNext steps:');
    console.log('- Run full E2E tests: npm run test:e2e');
    console.log('- Run tests with UI: npm run test:e2e:ui');
    console.log('- Debug tests: npm run test:e2e:debug');
    return true;
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} check(s) failed. Please review the errors above.`);
    console.log('\nTroubleshooting tips:');
    console.log('- Ensure the dev server is running (npm run dev)');
    console.log('- Check that test user credentials are valid');
    console.log('- Verify browser installation: npx playwright install');
    return false;
  }
}

if (require.main === module) {
  const success = testPlaywrightSetup();
  process.exit(success ? 0 : 1);
}

module.exports = { testPlaywrightSetup };
