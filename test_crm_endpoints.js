/**
 * Test des endpoints CRM
 */

const BASE_URL = 'http://127.0.0.1:3005';

async function testLeadDetail() {
  console.log('\n=== Test GET /api/crm-public/leads/:id ===');

  const response = await fetch(`${BASE_URL}/api/crm-public/leads/69272eee2a489f7a6`);
  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Has lead:', !!data.lead);
  console.log('Has notes:', !!data.notes);
  console.log('Has activities:', !!data.activities);

  if (data.notes) {
    console.log('Notes count:', data.notes.length);
  }

  if (data.activities) {
    console.log('Activities count:', data.activities.length);
  }

  console.log('\nFull response:');
  console.log(JSON.stringify(data, null, 2));
}

async function testChangeStatus() {
  console.log('\n=== Test PATCH /api/crm-public/leads/:id/status ===');

  const response = await fetch(`${BASE_URL}/api/crm-public/leads/69272eee2a489f7a6/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'In Process' })
  });

  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Success:', data.ok);
  console.log('New status:', data.lead?.status);
}

async function testAddNote() {
  console.log('\n=== Test POST /api/crm-public/leads/:id/notes ===');

  const response = await fetch(`${BASE_URL}/api/crm-public/leads/69272eee2a489f7a6/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Note de test via script' })
  });

  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Success:', data.ok);
  console.log('Note created:', !!data.note);
}

// Run tests
(async () => {
  try {
    await testLeadDetail();
    // await testChangeStatus();
    // await testAddNote();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
