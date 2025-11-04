#!/usr/bin/env node
/**
 * Comprehensive test for parser robustness
 */

const EL = require('./index.js');

console.log('=== ECHONET Lite Parser Robustness Test ===\n');

// Test 1: Malformed packet from Panasonic D-HEMS
console.log('Test 1: Malformed packet from Panasonic D-HEMS (should not crash)');
const malformedPacket = Buffer.from([
    0x01, 0x00, 0xff, 0xff, 0x06, 0x06, 0x24, 0x78,
    0x23, 0x0b, 0x99, 0x5c, 0x88, 0x88, 0x00, 0xff,
    0x00, 0xff, 0x09, 0x83, 0x05, 0xff, 0x01, 0x0e,
    0xf0, 0x01, 0xd6, 0x62
]);

try {
    const result = EL.parseBytes(malformedPacket);
    if (result === null) {
        console.log('✅ PASS: Malformed packet handled gracefully (returned null)\n');
    } else {
        console.log('⚠️  WARNING: Malformed packet was parsed (unexpected)\n');
    }
} catch (error) {
    console.log('❌ FAIL: Parser crashed');
    console.error('Error:', error.message);
    process.exit(1);
}

// Test 2: Valid ECHONET Lite packet (GET request)
console.log('Test 2: Valid ECHONET Lite GET request');
const validGetPacket = Buffer.from([
    0x10, 0x81,           // EHD
    0x00, 0x01,           // TID
    0x05, 0xff, 0x01,     // SEOJ (Controller)
    0x01, 0x30, 0x01,     // DEOJ (Air conditioner)
    0x62,                 // ESV (GET)
    0x01,                 // OPC (1 property)
    0x80,                 // EPC (Operation status)
    0x00                  // PDC (0 for GET)
]);

try {
    const result = EL.parseBytes(validGetPacket);
    if (result && result.EHD === '1081' && result.ESV === '62') {
        console.log('✅ PASS: Valid GET packet parsed correctly');
        console.log('   EHD:', result.EHD, 'ESV:', result.ESV, 'OPC:', result.OPC);
        console.log('   DETAILs:', JSON.stringify(result.DETAILs));
    } else {
        console.log('❌ FAIL: Valid GET packet parsing error');
        console.log('Result:', result);
        process.exit(1);
    }
} catch (error) {
    console.log('❌ FAIL: Valid GET packet caused crash');
    console.error('Error:', error.message);
    process.exit(1);
}
console.log('');

// Test 3: Valid ECHONET Lite packet (INF notification with data)
console.log('Test 3: Valid ECHONET Lite INF notification');
const validInfPacket = Buffer.from([
    0x10, 0x81,           // EHD
    0x00, 0x02,           // TID
    0x01, 0x30, 0x01,     // SEOJ (Air conditioner)
    0x05, 0xff, 0x01,     // DEOJ (Controller)
    0x73,                 // ESV (INF)
    0x01,                 // OPC (1 property)
    0x80,                 // EPC (Operation status)
    0x01,                 // PDC (1 byte)
    0x30                  // EDT (ON)
]);

try {
    const result = EL.parseBytes(validInfPacket);
    if (result && result.EHD === '1081' && result.ESV === '73') {
        console.log('✅ PASS: Valid INF packet parsed correctly');
        console.log('   EHD:', result.EHD, 'ESV:', result.ESV, 'OPC:', result.OPC);
        console.log('   DETAILs:', JSON.stringify(result.DETAILs));
    } else {
        console.log('❌ FAIL: Valid INF packet parsing error');
        console.log('Result:', result);
        process.exit(1);
    }
} catch (error) {
    console.log('❌ FAIL: Valid INF packet caused crash');
    console.error('Error:', error.message);
    process.exit(1);
}
console.log('');

// Test 4: Packet too short
console.log('Test 4: Packet too short (< 14 bytes)');
const shortPacket = Buffer.from([0x10, 0x81, 0x00, 0x01]);

try {
    const result = EL.parseBytes(shortPacket);
    if (result === null) {
        console.log('✅ PASS: Short packet handled gracefully\n');
    } else {
        console.log('❌ FAIL: Short packet was incorrectly parsed\n');
        process.exit(1);
    }
} catch (error) {
    console.log('❌ FAIL: Short packet caused crash');
    console.error('Error:', error.message);
    process.exit(1);
}

// Test 5: Multiple properties in one packet
console.log('Test 5: Multiple properties (OPC > 1)');
const multiPropPacket = Buffer.from([
    0x10, 0x81,           // EHD
    0x00, 0x03,           // TID
    0x05, 0xff, 0x01,     // SEOJ (Controller)
    0x01, 0x30, 0x01,     // DEOJ (Air conditioner)
    0x62,                 // ESV (GET)
    0x02,                 // OPC (2 properties)
    0x80,                 // EPC 1 (Operation status)
    0x00,                 // PDC 1
    0x8a,                 // EPC 2 (Manufacturer code)
    0x00                  // PDC 2
]);

try {
    const result = EL.parseBytes(multiPropPacket);
    if (result && result.EHD === '1081' && result.OPC === '02') {
        console.log('✅ PASS: Multi-property packet parsed correctly');
        console.log('   OPC:', result.OPC, '(expecting 02)');
        console.log('   DETAILs keys:', Object.keys(result.DETAILs));
    } else {
        console.log('❌ FAIL: Multi-property packet parsing error');
        console.log('Result:', result);
        process.exit(1);
    }
} catch (error) {
    console.log('❌ FAIL: Multi-property packet caused crash');
    console.error('Error:', error.message);
    process.exit(1);
}
console.log('');

console.log('=== All tests passed! ===');
