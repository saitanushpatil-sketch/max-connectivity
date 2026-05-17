#!/usr/bin/env node
/**
 * Generate VAPID keys for Web Push.
 * Run: node scripts/generateVapid.js
 *
 * Add the output to backend/.env and frontend/.env.local
 */
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=== MAX Connectivity — VAPID Keys ===\n');
console.log('Add these to backend/.env:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_EMAIL=mailto:admin@max-connectivity.app');
console.log('\nAdd to frontend/.env.local:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log('\n=====================================\n');
