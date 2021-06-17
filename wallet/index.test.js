const Wallet = require('./index')
const Transaction = require('./transaction');
const Blockchain = require('../blockchain/index.js')
const {verifySignature} = require('../util')

const {STARTING_BALANCE} = require('../config');
describe('Wallet',()=>{
    let wallet

    beforeEach(()=>{
        wallet = new Wallet();
    });

    it('has a `balance`',()=>{
        expect(wallet).toHaveProperty('balance');
    });

    it('has a `publicKey`',()=>{
        expect(wallet).toHaveProperty('publicKey')
    });

    describe('signing data',()=>{
        const data = 'foobar';

        it('verifies a signature',()=>{
            expect(verifySignature({
                publicKey: wallet.publicKey,
                data,
                signature: wallet.sign(data)
            })).toBe(true);
        })

        it('it does not verify a invalid signature',()=>{
            expect(verifySignature({
                publicKey: wallet.publicKey,
                data,
                signature: new Wallet().sign(data)
            })).toBe(false);
        })
    })

    describe('createTransaction',()=>{
        describe('amount exceeds balance',()=>{
            it('throws an error',()=>{
                expect(()=>wallet.createTransaction({amount:99999,recipient:'rec-pub'})).toThrow('Amount exceeds balance');
            })
        })

        describe('amount is valid',()=>{
            let transaction,recipient,amount;

            beforeEach(()=>{
                amount = 50;
                recipient = 'foo-recipient',
                transaction = wallet.createTransaction({amount,recipient});
            })
            it('creates an instance of `Transaction`',()=>{
                expect(transaction instanceof Transaction).toBe(true);
            })

            it('matches the transaction input with the wallet',()=>{
                expect(transaction.input.address).toEqual(wallet.publicKey)
            })

            it('outputs the amount to the recipient',()=>{
                expect(transaction.outputMap[recipient]).toEqual(amount);
            })
        })

        describe('a chain is passed',()=>{
            it('calls `Wallet.calculateBalance`',()=>{
                const calculateBalanceMock = jest.fn()
                const origCalculateBalance = Wallet.calculateBalance
                Wallet.calculateBalance = calculateBalanceMock;

                wallet.createTransaction({
                    recipient: 'foo',
                    amount: 100,
                    chain: new Blockchain().chain
                })

                expect(calculateBalanceMock).toHaveBeenCalled()
                Wallet.calculateBalance = origCalculateBalance
            })
        })
    })

    describe('calculateBalance()',()=>{
        let blockchain;

        beforeEach(()=>{
            blockchain = new Blockchain()
        })

        describe('and there are no outputs',()=>{
            it('returns the `STARTING_BALANCE`',()=>{
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })
                ).toEqual(STARTING_BALANCE)
            })
        })

        describe('there are some outputs for the wallet',()=>{
            let transactionOne, transactionTwo;

            beforeEach(()=>{
                transactionOne = new Wallet().createTransaction({recipient: wallet.publicKey,amount: 50})
                transactionTwo = new Wallet().createTransaction({recipient: wallet.publicKey,amount: 90})
                blockchain.addBlock({data: [transactionOne,transactionTwo]})
            })

            it('adds the sum of all outputs to the wallet balance',()=>{
                expect(
                    Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })
                ).toEqual(STARTING_BALANCE + transactionOne.outputMap[wallet.publicKey] + transactionTwo.outputMap[wallet.publicKey])
            })

            describe('and the wallet has a made a transaction',()=>{
                let recentTransaction;

                beforeEach(()=>{
                    recentTransaction = wallet.createTransaction({
                        recipient: 'foo-address',
                        amount: 30
                    })

                    blockchain.addBlock({data: recentTransaction})
                })

                it('returns the output amount of the recent transaction',()=>{
                    expect(
                        Wallet.calculateBalance({
                            chain: blockchain.chain,
                            address: wallet.publicKey
                        })
                    ).toEqual(recentTransaction.outputMap[wallet.publicKey])
                })

                describe('and there are outputs next to and after the recent transaction',()=>{
                    let sameBlockTransaction, nextBlockTransaction;

                    beforeEach(()=>{
                        recentTransaction = wallet.createTransaction({
                            recipient: 'foo-later', amount: 60
                        })
                
                        sameBlockTransaction = Transaction.rewardTransaction({minerWallet: wallet});

                        blockchain.addBlock({data: [recentTransaction,sameBlockTransaction]})

                        nextBlockTransaction = new Wallet().createTransaction({
                            recipient: [wallet.publicKey], amount: 100
                        })
                        
                        blockchain.addBlock({data: [nextBlockTransaction]});
                    })


                    it('includes an output amount that equals returned balance',()=>{
                        expect(
                            Wallet.calculateBalance({
                                chain: blockchain.chain,
                                address: wallet.publicKey
                            })
                        ).toEqual(recentTransaction.outputMap[wallet.publicKey] + sameBlockTransaction.outputMap[wallet.publicKey] + nextBlockTransaction.outputMap[wallet.publicKey]);
                    })
                });
            })
        })
    })

})