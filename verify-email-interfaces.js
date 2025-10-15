// verify-email-interfaces.js
// This script verifies that both email providers (Gmail and Resend) have the same interfaces

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying email provider interfaces...\n');

// Read both mailer files
const gmailMailerPath = path.join(__dirname, 'src/utils/gmailMailer.tsx');
const resendMailerPath = path.join(__dirname, 'src/utils/resendMailer.tsx');

const gmailMailer = fs.readFileSync(gmailMailerPath, 'utf8');
const resendMailer = fs.readFileSync(resendMailerPath, 'utf8');

// Check for exported functions
const expectedFunctions = [
  'sendVerificationEmail',
  'sendPasswordResetEmail', 
  'sendEmail',
  'sendDeletionEmail',
  'sendStudentOrderEmail',
  'sendSaleNotificationEmail'
];

console.log('📋 Checking exported functions:\n');

let allPassed = true;

expectedFunctions.forEach(funcName => {
  // Check gmailMailer exports
  const gmailExports = gmailMailer.match(/export\s*{\s*([^}]+)\s*}/);
  const gmailHasExport = gmailExports && gmailExports[1].includes(funcName);
  
  // Check resendMailer exports
  const resendExports = resendMailer.match(/export\s*{\s*([^}]+)\s*}/);
  const resendHasExport = resendExports && resendExports[1].includes(funcName);
  
  if (gmailHasExport && resendHasExport) {
    console.log(`✅ ${funcName} - exported from both providers`);
  } else {
    console.log(`❌ ${funcName} - missing from ${!gmailHasExport ? 'gmailMailer' : ''} ${!resendHasExport ? 'resendMailer' : ''}`);
    allPassed = false;
  }
});

console.log('\n📋 Checking interface definitions:\n');

// Check for interface definitions
const expectedInterfaces = [
  'SendVerificationEmailParams',
  'SendPasswordResetEmailParams',
  'SendEmailParams',
  'SendDeletionEmailParams',
  'SendStudentOrderEmailParams',
  'SendSaleNotificationEmailParams'
];

expectedInterfaces.forEach(interfaceName => {
  const gmailHasInterface = gmailMailer.includes(`interface ${interfaceName}`);
  const resendHasInterface = resendMailer.includes(`interface ${interfaceName}`);
  
  if (gmailHasInterface && resendHasInterface) {
    console.log(`✅ ${interfaceName} - defined in both providers`);
  } else {
    console.log(`❌ ${interfaceName} - missing from ${!gmailHasInterface ? 'gmailMailer' : ''} ${!resendHasInterface ? 'resendMailer' : ''}`);
    allPassed = false;
  }
});

console.log('\n📋 Checking router implementation:\n');

// Check that gmailMailer has router functions
expectedFunctions.forEach(funcName => {
  const routerPattern = new RegExp(`const ${funcName} = async \\(params[^)]*\\) => {[^}]*EMAIL_PROVIDER`, 's');
  const hasRouter = routerPattern.test(gmailMailer);
  
  if (hasRouter) {
    console.log(`✅ ${funcName} - router function implemented`);
  } else {
    console.log(`⚠️  ${funcName} - router function not found (this is ok if using direct implementation)`);
  }
});

console.log('\n📋 Checking environment variable usage:\n');

// Check for EMAIL_PROVIDER usage
if (gmailMailer.includes('EMAIL_PROVIDER')) {
  console.log('✅ EMAIL_PROVIDER environment variable is used in gmailMailer');
} else {
  console.log('❌ EMAIL_PROVIDER environment variable not found in gmailMailer');
  allPassed = false;
}

// Check for proper imports
if (gmailMailer.includes('import * as ResendMailer from \'./resendMailer\'')) {
  console.log('✅ ResendMailer is properly imported in gmailMailer');
} else {
  console.log('❌ ResendMailer import not found in gmailMailer');
  allPassed = false;
}

console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ ALL CHECKS PASSED - Email providers are properly configured!');
  console.log('\nYou can now switch between providers by setting:');
  console.log('  EMAIL_PROVIDER=gmail  (default)');
  console.log('  EMAIL_PROVIDER=resend');
  process.exit(0);
} else {
  console.log('❌ Some checks failed - please review the errors above');
  process.exit(1);
}

