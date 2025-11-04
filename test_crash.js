#!/usr/bin/env node
/**
 * Test bench to reproduce the parsing crash with Panasonic D-HEMS packet
 */

const EL = require('./index.js');

// The problematic packet from Panasonic D-HEMS (HF-MC10A2DH)
const problematicPacket = Buffer.from([
    0x01, 0x00, 0xff, 0xff, 0x06, 0x06, 0x24, 0x78,
    0x23, 0x0b, 0x99, 0x5c, 0x88, 0x88, 0x00, 0xff,
    0x00, 0xff, 0x09, 0x83, 0x05, 0xff, 0x01, 0x0e,
    0xf0, 0x01, 0xd6, 0x62
]);

console.log('Testing echonet-lite.js parser with Panasonic D-HEMS packet');
console.log('Packet:', problematicPacket);
console.log('Packet hex:', problematicPacket.toString('hex'));
console.log('');

try {
    console.log('Attempting to parse the packet...');
    const result = EL.parseBytes(problematicPacket);
    console.log('Parse result:', result);
    console.log('✅ SUCCESS: Packet parsed without crash');
} catch (error) {
    console.log('❌ CRASH: Parser threw an exception');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
