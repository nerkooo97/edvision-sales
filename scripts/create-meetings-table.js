/**
 * Skripta za kreiranje 'meetings' tabele u Appwrite bazi.
 * Pokretanje: node scripts/create-meetings-table.js
 */

require('dotenv').config({ path: '.env.local' });
const { Client, Databases } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://appwrite.ed-vision.com/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a7dd764002484e4cc47';
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '6a7dd77a002b3913d433';
const TABLE_ID = 'meetings';

if (!API_KEY) {
  console.error('APPWRITE_API_KEY nije postavljen u .env.local!');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

async function createTable() {
  console.log('Kreiranje tabele "meetings" u Appwrite...');
  console.log('Endpoint:', ENDPOINT);
  console.log('Database:', DATABASE_ID);

  // Provjera da li tabela vec postoji
  try {
    await databases.getCollection(DATABASE_ID, TABLE_ID);
    console.log('UPOZORENJE: Tabela "meetings" vec postoji. Preskacemo kreiranje kolekcije.');
  } catch {
    try {
      await databases.createCollection(
        DATABASE_ID,
        TABLE_ID,
        'meetings',
        [],
        false
      );
      console.log('OK: Tabela "meetings" kreirana.');
    } catch (err) {
      console.error('GRESKA pri kreiranju tabele:', err.message);
      process.exit(1);
    }
  }

  const attributes = [
    { fn: 'createStringAttribute',   args: [DATABASE_ID, TABLE_ID, 'title', 500, true],              label: 'title' },
    { fn: 'createDatetimeAttribute', args: [DATABASE_ID, TABLE_ID, 'scheduled_at', true],             label: 'scheduled_at' },
    { fn: 'createIntegerAttribute',  args: [DATABASE_ID, TABLE_ID, 'duration_min', false, 0, 9999, 60], label: 'duration_min' },
    { fn: 'createStringAttribute',   args: [DATABASE_ID, TABLE_ID, 'location_type', 100, true],      label: 'location_type' },
    { fn: 'createStringAttribute',   args: [DATABASE_ID, TABLE_ID, 'location_note', 1000, false],    label: 'location_note' },
    { fn: 'createStringAttribute',   args: [DATABASE_ID, TABLE_ID, 'status', 100, false, 'Zakazan'], label: 'status' },
    { fn: 'createStringAttribute',   args: [DATABASE_ID, TABLE_ID, 'notes', 5000, false],            label: 'notes' },
    { fn: 'createStringAttribute',   args: [DATABASE_ID, TABLE_ID, 'company_id', 100, false],        label: 'company_id' },
    { fn: 'createStringAttribute',   args: [DATABASE_ID, TABLE_ID, 'company_name', 500, false],      label: 'company_name' },
  ];

  console.log('\nKreiranje kolona...');

  for (const attr of attributes) {
    try {
      await databases[attr.fn](...attr.args);
      console.log('OK: Kolona "' + attr.label + '" kreirana.');
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      if (err.code === 409 || (err.message && err.message.includes('already exists'))) {
        console.log('PRESKACAM: Kolona "' + attr.label + '" vec postoji.');
      } else {
        console.error('GRESKA pri kreiranju kolone "' + attr.label + '":', err.message);
      }
    }
  }

  console.log('\nSve kolone kreirane!');
  console.log('Tabela "meetings" je uspjesno pripremljena!');
}

createTable().catch(err => {
  console.error('Fatalna greska:', err);
  process.exit(1);
});
