//
// Tests for Wallets
//

var assert = require('assert');
var should = require('should');
var bitcoin = require('bitcoinjs-lib');

var common = require('../../src/common');
var TestV2BitGo = require('../lib/test_bitgo');
var Q = require('q');

describe('V2 Wallets:', function() {
  var bitgo;
  var wallets;
  var keychains;
  var basecoin;

  before(function() {
    // TODO: replace dev with test
    bitgo = new TestV2BitGo({ env: 'test' });
    bitgo.initializeTestVars();
    basecoin = bitgo.coin('tbtc');
    wallets = basecoin.wallets();
    keychains = basecoin.keychains();
    return bitgo.authenticateTestUser(bitgo.testUserOTP());
  });

  describe('Per-coin tests', function() {
    const coins = ['tbtc', 'txrp', 'teth'];

    for (const currentCoin of coins){
      let basecoin;
      let wallets;

      before(function() {
        basecoin = bitgo.coin(currentCoin);
        wallets = basecoin.wallets();
      });

      it(`generates ${currentCoin} wallet`, function() {
        const params = {
          label: `Test ${currentCoin} wallet`,
          passphrase: 'yoplait'
        };
        return wallets.generateWallet(params)
        .then(function(wallet) {
          const walletObject = wallet.wallet;
          walletObject._wallet.coin.should.equal(currentCoin);
          console.log('here');
        });
      });
    }
  });

  describe('List', function() {
    it('arguments', function() {
      assert.throws(function() { wallets.list({}, 'invalid'); });
      assert.throws(function() { wallets.list('invalid'); });
    });

    it('skip', function(done) {
      // TODO server currently doesn't use this param
      done()
    });

    it('getbalances', function(done) {
      // TODO server currently doesn't use this param
      done()
    });

    it('prevId', function(done) {
      // TODO server currently doesn't use this param
      done()
    });
  });

  describe('Generate Wallet', function() {
    var passphrase = 'yoplait';
    var label = 'v2 wallet';

    it('arguments', function() {
      assert.throws(function() {wallets.generateWallet();});
      assert.throws(function() {wallets.generateWallet('invalid');});
      assert.throws(function() {wallets.generateWallet({}, 0);});
      assert.throws(function() {
        wallets.generateWallet({
          passphrase: passphrase,
          label: label,
          backupXpub: 'xpub',
          backupXpubProvider: 'krs'
        }, function() {
        });
      });
      assert.throws(function() {
        wallets.generateWallet({
          passphrase: passphrase,
          label: label,
          disableTransactionNotifications: 'blah'
        }, function() {
        });
      });
    });

    it('should make wallet with client-generated user and backup key', function() {
      var params = {
        passphrase: passphrase,
        label: label,
        disableTransactionNotifications: true
      };

      return wallets.generateWallet(params)
      .then(function(res) {
        res.should.have.property('wallet');
        res.should.have.property('userKeychain');
        res.should.have.property('backupKeychain');
        res.should.have.property('bitgoKeychain');

        res.userKeychain.should.have.property('pub');
        res.userKeychain.should.have.property('prv');
        res.userKeychain.should.have.property('encryptedPrv');

        res.backupKeychain.should.have.property('pub');
        res.backupKeychain.should.have.property('prv');

        res.bitgoKeychain.should.have.property('pub');
        res.bitgoKeychain.isBitGo.should.equal(true);
        res.bitgoKeychain.should.not.have.property('prv');
        res.bitgoKeychain.should.not.have.property('encryptedPrv');
      });
    });

    it('should make wallet with client-generated user and krs backupkey', function() {

      var xpub = keychains.create().pub; // random xpub
      var params = {
        passphrase: passphrase,
        label: label,
        backupXpub: xpub
      };
      return wallets.generateWallet(params)
      .then(function(res) {
        res.should.have.property('wallet');
        res.should.have.property('userKeychain');
        res.should.have.property('backupKeychain');
        res.should.have.property('bitgoKeychain');

        res.backupKeychain.should.have.property('pub');
        res.backupKeychain.should.not.have.property('prv');
      });
    });

    it('should make wallet with provided user key and backup key', function() {
      var backupXpub = keychains.create().pub; // random xpub
      var userXpub = keychains.create().pub; // random xpub
      var params = {
        label: label,
        backupXpub: backupXpub,
        userKey: userXpub
      };

      return wallets.generateWallet(params)
      .then(function(res) {
        res.should.have.property('wallet');
        res.should.have.property('userKeychain');
        res.should.have.property('backupKeychain');
        res.should.have.property('bitgoKeychain');

        res.userKeychain.should.have.property('pub');
        res.userKeychain.should.not.have.property('prv');
        res.userKeychain.should.not.have.property('encryptedPrv');
      });
    });

    it('should generate wallet and freeze it', function() {
      var backupXpub = keychains.create().pub; // random xpub
      var userXpub = keychains.create().pub; // random xpub
      var params = {
        label: label,
        backupXpub: backupXpub,
        userKey: userXpub
      };

      return bitgo.unlock({ otp: '0000000' })
      .then(function(res) {
        return wallets.generateWallet(params);
      })
      .then(function(res) {
        return res.wallet.freeze({ otp: '0000000' });
      })
      .then(function(freeze) {
        freeze.should.have.property('expires');
        freeze.should.have.property('time');
      });
    });
  });

  describe('Add Wallet', function() {

    var userKeychainId;
    var backupKeychainId;
    var bitgoKeychainId;

    it('arguments', function() {
      assert.throws(function() {wallets.add();});
      assert.throws(function() {wallets.add('invalid');});
      assert.throws(function() {wallets.add({}, 0);});
    });

    it('should add a wallet with pre generated keys', function() {

      var userKeychain;
      var backupKeychain;
      var bitgoKeychain;

      // Add the user keychain
      var userKeychainPromise = Q.fcall(function() {
        userKeychain = keychains.create();
        return keychains.add(userKeychain);
      }).then(function(keychain) {
        userKeychainId = keychain.id;
      });

      var backupKeychainPromise = Q.fcall(function() {
        backupKeychain = keychains.create();
        return keychains.add(backupKeychain);
      })
      .then(function(newBackupKeychain) {
        backupKeychainId = newBackupKeychain.id;
      });

      var bitgoKeychainPromise = keychains.createBitGo()
      .then(function(keychain) {
        bitgoKeychainId = keychain.id;
      });

      // Add the user keychain
      return Q.all([userKeychainPromise, backupKeychainPromise, bitgoKeychainPromise])
      .then(function() {
        var params = {
          label: 'sample wallet',
          m: 2,
          n: 3,
          keys: [userKeychainId, backupKeychainId, bitgoKeychainId],
          enterprise: '',
          isCold: true
        }
        return wallets.add(params)
      }).then(function(res) {
        res.should.have.property('wallet');
        res.wallet.should.have.property('_wallet');
        res.wallet._wallet.should.have.property('keys');
        res.wallet._wallet.keys[0].should.equal(userKeychainId);
        res.wallet._wallet.keys[1].should.equal(backupKeychainId);
        res.wallet._wallet.keys[2].should.equal(bitgoKeychainId);
      });
    });
  });

  describe('Get Wallet', function() {
    it('should get wallet', function() {
      return wallets.getWallet({ id: TestV2BitGo.V2.TEST_WALLET1_ID })
      .then(function(wallet) {
        should.exist(wallet);
        wallet.should.have.property('baseCoin');
        wallet.should.have.property('bitgo');
        wallet.should.have.property('_wallet');
        wallet = wallet._wallet;
        wallet.label.should.equal('v2 test wallet');
        wallet.balance.should.be.greaterThan(0);
        wallet.confirmedBalance.should.be.greaterThan(0);
        wallet.coin.should.equal('tbtc');
        wallet.id.should.equal(TestV2BitGo.V2.TEST_WALLET1_ID);
        wallet.approvalsRequired.should.equal(1);
        wallet.m.should.equal(2);
        wallet.n.should.equal(3);
      })
    });

    it('should add webhook to wallet, simulate it, and then remove it', function() {
      var wallet;
      var count;
      var webhookId;
      return wallets.getWallet({ id: TestV2BitGo.V2.TEST_WALLET1_ID })
      .then(function(currentWallet) {
        wallet = currentWallet;
        return wallet.listWebhooks();
      })
      .then(function(webhooks) {
        webhooks.should.have.property('webhooks');
        count = webhooks.webhooks.length;
        return wallet.addWebhook({
          url: 'https://mockbin.org/bin/dbd0a0cd-060a-4a64-8cd8-f3113b36cb7d',
          type: 'transaction'
        });
      })
      .then(function(webhook) {
        webhook.should.have.property('id');
        webhook.should.have.property('url');
        webhook.should.have.property('type');
        webhook.should.have.property('coin');
        webhook.should.have.property('walletId');
        webhookId = webhook.id;
        return wallet.listWebhooks();
      })
      .then(function(webhooks) {
        webhooks.should.have.property('webhooks');
        webhooks.webhooks.length.should.equal(count + 1);
        return wallet.simulateWebhook({
          webhookId: webhookId,
          txHash: 'e0119a0695efee3229978df74cbb066269890947d85c80ab630a4075b141b880'
        });
      }).then(function(simulation) {
        simulation.should.have.property('webhookNotifications');
        var notification = simulation.webhookNotifications[0];
        notification.url.should.equal('https://mockbin.org/bin/dbd0a0cd-060a-4a64-8cd8-f3113b36cb7d');
        notification.hash.should.equal('e0119a0695efee3229978df74cbb066269890947d85c80ab630a4075b141b880');
        notification.type.should.equal('transaction');
        notification.coin.should.equal('bitcoin');
        return wallet.removeWebhook({
          url: 'https://mockbin.org/bin/dbd0a0cd-060a-4a64-8cd8-f3113b36cb7d',
          type: 'transaction'
        });
      })
      .then(function(webhookRemoval) {
        webhookRemoval.should.have.property('removed');
        return wallet.listWebhooks();
      })
      .then(function(webhooks) {
        webhooks.should.have.property('webhooks');
        webhooks.webhooks.length.should.equal(count);
      })
    });
  });
});
