#!/usr/bin/env node
// scripts/test-sendgrid.js
// Script de test pour vérifier que SendGrid fonctionne correctement

const https = require('https');

const BASE_URL = 'http://localhost:3000/api';

// Fonction pour faire une requête POST
function makeRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Tests
async function runTests() {
  console.log('🧪 Démarrage des tests SendGrid...\n');

  const tests = [
    {
      name: 'Test Email Confirmation École',
      endpoint: '/test-sendgrid-emails',
      data: { testType: 'school' }
    },
    {
      name: 'Test Email Confirmation Étudiant',
      endpoint: '/test-sendgrid-emails',
      data: { testType: 'student' }
    },
    {
      name: 'Test Email Confirmation Commande',
      endpoint: '/test-sendgrid-emails',
      data: { testType: 'order' }
    },
    {
      name: 'Test Email Confirmation Massibec',
      endpoint: '/test-sendgrid-emails',
      data: { testType: 'massibec' }
    },
    {
      name: 'Test Email Vérification',
      endpoint: '/test-sendgrid-emails',
      data: { testType: 'verification' }
    },
    {
      name: 'Test Email Réinitialisation',
      endpoint: '/test-sendgrid-emails',
      data: { testType: 'password' }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`⏳ ${test.name}...`);
      const result = await makeRequest(test.endpoint, test.data);
      
      if (result.status === 200 && result.data.success) {
        console.log(`✅ ${test.name} - SUCCÈS`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - ÉCHEC`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - ERREUR`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('📊 Résultats des tests:');
  console.log(`✅ Succès: ${passed}`);
  console.log(`❌ Échecs: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 Tous les tests sont passés ! SendGrid est configuré correctement.');
  } else {
    console.log('\n⚠️  Certains tests ont échoué. Vérifiez la configuration SendGrid.');
  }
}

// Vérifier que le serveur est démarré
console.log('⚠️  Assurez-vous que le serveur Next.js est démarré (npm run dev)');
console.log('⚠️  Assurez-vous que SENDGRID_API_KEY est configuré dans .env.local\n');

runTests().catch(console.error);
