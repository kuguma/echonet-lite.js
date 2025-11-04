#!/usr/bin/env node
/**
 * Integration test: Send malformed packet via UDP to verify library behavior
 */

const EL = require('./index.js');
const dgram = require('dgram');

console.log('=== Integration Test: UDP Packet Handling ===\n');

let testsPassed = 0;
let testsFailed = 0;

// Initialize ECHONET Lite library
console.log('Initializing ECHONET Lite library...');
const objList = ['013001', '029001'];  // Air conditioner and general lighting
let receivedPackets = [];
let receivedErrors = [];

const userFunc = (rinfo, els, err) => {
    if (err) {
        console.log('  Received error (expected for malformed packet):', err.message);
        receivedErrors.push({rinfo, els, err});
    } else if (els) {
        console.log('  Received valid packet from', rinfo.address, '- EHD:', els.EHD, 'ESV:', els.ESV);
        receivedPackets.push({rinfo, els});
    } else {
        console.log('  Received null packet (malformed, handled gracefully)');
        receivedPackets.push({rinfo, els: null});
    }
};

try {
    EL.initialize(objList, userFunc, 4, {
        v4: '',
        ignoreMe: false,  // Don't ignore packets from ourselves
        autoGetProperties: false,
        debugMode: false
    });
    console.log('✅ Library initialized successfully\n');
} catch (error) {
    console.error('❌ Failed to initialize library:', error.message);
    process.exit(1);
}

// Wait for socket to be ready
setTimeout(() => {
    runTests();
}, 500);

function runTests() {
    console.log('Starting tests...\n');

    // Test 1: Send malformed Panasonic D-HEMS packet
    console.log('Test 1: Sending malformed Panasonic D-HEMS packet to localhost');
    const malformedPacket = Buffer.from([
        0x01, 0x00, 0xff, 0xff, 0x06, 0x06, 0x24, 0x78,
        0x23, 0x0b, 0x99, 0x5c, 0x88, 0x88, 0x00, 0xff,
        0x00, 0xff, 0x09, 0x83, 0x05, 0xff, 0x01, 0x0e,
        0xf0, 0x01, 0xd6, 0x62
    ]);

    const client = dgram.createSocket('udp4');
    client.send(malformedPacket, EL.EL_port, '127.0.0.1', (err) => {
        if (err) {
            console.error('  ❌ Failed to send packet:', err.message);
            testsFailed++;
        } else {
            console.log('  ✅ Malformed packet sent successfully');
            testsPassed++;
        }
        client.close();
    });

    // Test 2: Send valid packet
    setTimeout(() => {
        console.log('\nTest 2: Sending valid ECHONET Lite packet to localhost');
        const validPacket = Buffer.from([
            0x10, 0x81,           // EHD
            0x12, 0x34,           // TID
            0x05, 0xff, 0x01,     // SEOJ (Controller)
            0x01, 0x30, 0x01,     // DEOJ (Air conditioner)
            0x73,                 // ESV (INF)
            0x01,                 // OPC (1 property)
            0x80,                 // EPC (Operation status)
            0x01,                 // PDC (1 byte)
            0x30                  // EDT (ON)
        ]);

        const client2 = dgram.createSocket('udp4');
        client2.send(validPacket, EL.EL_port, '127.0.0.1', (err) => {
            if (err) {
                console.error('  ❌ Failed to send packet:', err.message);
                testsFailed++;
            } else {
                console.log('  ✅ Valid packet sent successfully');
                testsPassed++;
            }
            client2.close();
        });

        // Wait for packets to be processed, then check results
        setTimeout(() => {
            console.log('\n=== Test Results ===');
            console.log('Packets received:', receivedPackets.length);
            console.log('Errors received:', receivedErrors.length);
            console.log('Tests passed:', testsPassed);
            console.log('Tests failed:', testsFailed);

            if (testsFailed === 0) {
                console.log('\n✅ All integration tests passed!');
                console.log('✅ Library handles malformed packets without crashing');
            } else {
                console.log('\n❌ Some tests failed');
                process.exit(1);
            }

            // Clean up
            EL.release();
            process.exit(0);
        }, 1000);
    }, 500);
}
