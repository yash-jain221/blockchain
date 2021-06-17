const Transaction = require('./transaction')
const Wallet = require('./index');
const {verifySignature} = require('../util');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

describe('Transaction',()=>{    
    let transaction, senderWallet, recipient, amount;
    beforeEach(()=>{
        senderWallet = new Wallet();
        recipient = 'rec-public-key'
        amount = 50
        transaction = new Transaction({senderWallet,recipient,amount});
    })
    it('has an `id`',()=>{
        expect(transaction).toHaveProperty('id');
    })

    describe('outputWallet',()=>{
        it('has an outputWallet property',()=>{
            expect(transaction).toHaveProperty('outputMap')
        })

        it('outputs the amount to recipient',()=>{
            expect(transaction.outputMap[recipient]).toEqual(amount)
        })

        it('outputs the remaining balance for the `senderWallet`',()=>{
            expect(transaction.outputMap[senderWallet.publicKey]).toEqual(senderWallet.balance - amount)
        })
    })

    describe('input',()=>{
        it('has an `input`',()=>{
            expect(transaction).toHaveProperty('input')
        })

        it('has a timestamp in the input',()=>{
            expect(transaction.input).toHaveProperty('timestamp')
        })

        it('sets the amount to the senderWallet balance',()=>{
            expect(transaction.input.amount).toEqual(senderWallet.balance)
        })

        it('sets `address equal to senderWallet publicKey',()=>{
            expect(transaction.input.address).toEqual(senderWallet.publicKey)
        })

        it('signs the input',()=>{
            expect(
                verifySignature({
                    publicKey: senderWallet.publicKey,
                    data: transaction.outputMap,
                    signature: transaction.input.signature
                })
            ).toBe(true)
        })
    })

    describe('validTransaction()',()=>{

        let errorMock;

        beforeEach(()=>{
            errorMock = jest.fn();

            global.console.error = errorMock
        })
        describe('when the transaction is valid',()=>{
            it('returns true',()=>{
                expect(Transaction.validTransaction(transaction)).toBe(true)
            })
        })

        describe('when the transaction is invalid',()=>{
            describe('and the outputMap data is invalid',()=>{
                it('returns false and logs an error',()=>{
                    transaction.outputMap[senderWallet.publicKey] = 0
                    expect(Transaction.validTransaction(transaction)).toBe(false)
                    expect(errorMock).toHaveBeenCalled();
                })
            })

            describe('and the transaction signature is invalid',()=>{
                it('returns false and logs an error',()=>{
                    transaction.input.signature = new Wallet().sign('data');
                    expect(Transaction.validTransaction(transaction)).toBe(false)
                    expect(errorMock).toHaveBeenCalled();
                })
            })
        })
    })

    describe('update()',()=>{
        let originalSignature, originalSenderOutput, nextRecipient, nextAmount;

        describe('the amount is invalid',()=>{
            it('it throws an error',()=>{
                expect(()=>{transaction.update({senderWallet,recipient:"foo_pub",amount: 9999})}).toThrow("Amount exceeds balance")
            })
        })

        describe('the amount is valid',()=>{
            beforeEach(()=>{
                originalSignature = transaction.input.signature;
                originalSenderOutput = transaction.outputMap[senderWallet.publicKey];
                nextRecipient = 'foo-recipient'
                nextAmount = 100
    
                transaction.update({senderWallet,recipient: nextRecipient,amount: nextAmount})
            })
    
            it('outputs the amount to the next recipient',()=>{
                expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount)
            })
    
            it('substracts the amount from the orignal sender output',()=>{
                expect(transaction.outputMap[senderWallet.publicKey]).toEqual(originalSenderOutput - nextAmount)
            })
    
            it('it maintains a total output that matches the input amount',()=>{
                expect(Object.values(transaction.outputMap).reduce((total,amt)=> total + amt)).toEqual(transaction.input.amount)
            })
    
            it('it re-signs the transaction',()=>{
                expect(transaction.input.signature).not.toEqual(originalSignature)
            })

            describe("and another update for the same recipient",()=>{
                let addAmt;

                beforeEach(()=>{
                    addAmt = 80;
                    transaction.update({senderWallet,recipient: nextRecipient,amount: addAmt})
                })

                it('adds the new amount to the recipient',()=>{
                    expect(transaction.outputMap[nextRecipient]).toEqual(nextAmount + addAmt);
                })

                it('substracts the amount from the original output as well',()=>{
                    expect(transaction.outputMap[senderWallet.publicKey]).toEqual(originalSenderOutput - (nextAmount + addAmt))
                })
            })
        })
        
    })

    describe('rewardTransaction()',()=>{
        let rewardTransaction, minerWallet;

        beforeEach(()=>{
            minerWallet = new Wallet()
            rewardTransaction = Transaction.rewardTransaction({minerWallet});
        })

        it('creates a transaction with the reward input',()=>{
            expect(rewardTransaction.input).toEqual(REWARD_INPUT)
        })

        it('creates ones transaction for the miner with the `MINING_REWARD`',()=>{
            expect(rewardTransaction.outputMap[minerWallet.publicKey]).toEqual(MINING_REWARD)
        })
    })

})