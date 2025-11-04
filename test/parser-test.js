//////////////////////////////////////////////////////////////////////
// echonet-lite.js パーサーのテスト
//////////////////////////////////////////////////////////////////////
'use strict';

const assert = require('assert');
const EL = require('../index.js');

describe('EL.parseBytes - 無効なパケット処理', function() {

    // テスト前の準備
    before(function() {
        // ライブラリの初期化（送信機能は不要なので最小限の設定）
        // 実際のソケットを作らないようにするため、ipVerを設定しない
    });

    // テスト後のクリーンアップ
    after(function() {
        // リソースの解放
        if (typeof EL.release === 'function') {
            try {
                EL.release();
            } catch (e) {
                // エラーを無視
            }
        }
    });

    it('Panasonic D-HEMSの無効なパケットでクラッシュしないこと', function() {
        // Panasonic D-HEMS(HF-MC10A2DH)が送信するパケット
        // EHD1=0x01, EHD2=0x00 なので、ECHONET Liteの仕様外
        const invalidPacket = Buffer.from([
            0x01, 0x00, 0xff, 0xff, 0x06, 0x06, 0x24, 0x78,
            0x23, 0x0b, 0x99, 0x5c, 0x88, 0x88, 0x00, 0xff,
            0x00, 0xff, 0x09, 0x83, 0x05, 0xff, 0x01, 0x0e,
            0xf0, 0x01, 0xd6, 0x62
        ]);

        // この関数は例外を投げずにnullまたは適切なエラーを返すべき
        let result;
        assert.doesNotThrow(function() {
            result = EL.parseBytes(invalidPacket);
        }, 'parseBytes()は無効なパケットで例外を投げてはいけない');

        // 無効なパケットの場合はnullを返すべき
        assert.strictEqual(result, null, '無効なパケットの場合はnullを返すべき');
    });

    it('EHD1が0x10でないパケットを拒否すること', function() {
        // EHD1=0x11（無効）, EHD2=0x81（有効）のパケット
        const invalidEHD1 = Buffer.from([
            0x11, 0x81, 0x00, 0x01, // EHD + TID
            0x05, 0xff, 0x01,       // SEOJ
            0x05, 0xff, 0x01,       // DEOJ
            0x62,                   // ESV (GET)
            0x01,                   // OPC
            0x80,                   // EPC
            0x00                    // PDC
        ]);

        let result;
        assert.doesNotThrow(function() {
            result = EL.parseBytes(invalidEHD1);
        });
        assert.strictEqual(result, null, 'EHD1が0x10でない場合はnullを返すべき');
    });

    it('EHD2が0x81でも0x82でもないパケットを拒否すること（EHD1は有効）', function() {
        // EHD1=0x10（有効）, EHD2=0x00（無効）のパケット
        const invalidEHD2 = Buffer.from([
            0x10, 0x00, 0x00, 0x01, // EHD + TID
            0x05, 0xff, 0x01,       // SEOJ
            0x05, 0xff, 0x01,       // DEOJ
            0x62,                   // ESV (GET)
            0x01,                   // OPC
            0x80,                   // EPC
            0x00                    // PDC
        ]);

        let result;
        assert.doesNotThrow(function() {
            result = EL.parseBytes(invalidEHD2);
        });
        assert.strictEqual(result, null, 'EHD2が0x81/0x82でない場合はnullを返すべき');
    });

    it('有効なECHONET Liteパケット（フォーマット1）を正しくパースすること', function() {
        // EHD1=0x10, EHD2=0x81（フォーマット1）の正しいパケット
        const validPacket = Buffer.from([
            0x10, 0x81, 0x00, 0x01, // EHD + TID
            0x05, 0xff, 0x01,       // SEOJ
            0x05, 0xff, 0x01,       // DEOJ
            0x62,                   // ESV (GET)
            0x01,                   // OPC
            0x80,                   // EPC
            0x00                    // PDC
        ]);

        let result;
        assert.doesNotThrow(function() {
            result = EL.parseBytes(validPacket);
        });
        assert.notStrictEqual(result, null, '有効なパケットはnullを返してはいけない');
        assert.strictEqual(result.EHD, '1081', 'EHDは1081であるべき');
        assert.strictEqual(result.TID, '0001', 'TIDは0001であるべき');
    });

    it('有効なECHONET Liteパケット（フォーマット2）を正しくパースすること', function() {
        // EHD1=0x10, EHD2=0x82（フォーマット2）のパケット
        const validPacket = Buffer.from([
            0x10, 0x82, 0x01, 0x02, 0x03, 0x04 // EHD + 任意データ
        ]);

        let result;
        assert.doesNotThrow(function() {
            result = EL.parseBytes(validPacket);
        });
        assert.notStrictEqual(result, null, '有効なパケットはnullを返してはいけない');
        assert.strictEqual(result.EHD, '1082', 'EHDは1082であるべき');
        assert.strictEqual(result.AMF, '01020304', 'AMFは01020304であるべき');
    });

    it('OPCが実際のデータ数より大きいパケットでクラッシュしないこと', function() {
        // OPC=0x05（5個のプロパティ）だが、実際には1個しかデータがないパケット
        const malformedPacket = Buffer.from([
            0x10, 0x81, 0x00, 0x01, // EHD + TID
            0x05, 0xff, 0x01,       // SEOJ
            0x05, 0xff, 0x01,       // DEOJ
            0x62,                   // ESV (GET)
            0x05,                   // OPC=5（実際のデータより大きい）
            0x80,                   // EPC
            0x00                    // PDC（ここで終わり、残り4個のプロパティがない）
        ]);

        let result;
        assert.doesNotThrow(function() {
            result = EL.parseBytes(malformedPacket);
        }, 'OPCが不正なパケットで例外を投げてはいけない');

        // 不正なパケットの場合はnullを返すべき
        assert.strictEqual(result, null, 'OPCが不正なパケットはnullを返すべき');
    });

    it('14バイト未満のパケットを拒否すること', function() {
        const tooShort = Buffer.from([0x10, 0x81, 0x00, 0x01]);

        let result;
        assert.doesNotThrow(function() {
            result = EL.parseBytes(tooShort);
        });
        assert.strictEqual(result, null, '14バイト未満のパケットはnullを返すべき');
    });
});
