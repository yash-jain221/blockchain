const TransactionPool = require('./transaction-pool')
const Transaction = require('./transaction')
const Wallet = require('./index');
const Blockchain = require('../blockchain')

describe('TransactionPool()',()=>{
    let transactionPool, transaction, senderWallet;

    beforeEach(()=>{
        transactionPool = new TransactionPool();
        senderWallet = new Wallet();
        transaction = new Transaction({
            senderWallet,
            recipient: 'foo-public-key',
            amount: 50
        })
    })

    describe('setTransaction()',()=>{
        it('adds a transaction to the transaction pool',()=>{
            transactionPool.setTransaction(transaction);
            expect(transactionPool.transactionMap[transaction.id]).toBe(transaction);
        })
    })

    describe('ValidTransactions()',()=>{
        let validTransactions,errorMock;

        beforeEach(()=>{
            validTransactions = [];
            errorMock = jest.fn()
            global.console.error = errorMock
            for(let i =0;i<10;i++){
                transaction = new Transaction({
                    senderWallet,
                    recipient: 'any-key',
                    amount: 100
                })
                if(i%3 === 0){
                    transaction.input.amount = 99999;
                }else if(i%3 === 1){
                    transaction.input.signature = new Wallet().sign('foo')
                }else{
                    validTransactions.push(transaction);
                }
                transactionPool.setTransaction(transaction)
            }
        })


        it('returns valid transactions',()=>{
            expect(transactionPool.validTransactions()).toEqual(validTransactions);
        })

        it('logs error',()=>{
            transactionPool.validTransactions()
            expect(errorMock).toHaveBeenCalled()
        })
    })

    describe('clear()',()=>{
        it('clears the transactions',()=>{
            transactionPool.clear();
            expect(transactionPool.transactionMap).toEqual({})
        })
    })

    describe('clearBlockchainTransactions()',()=>{
        it('clears the pool of any existing blockchains transactions',()=>{
            const blockchain = new Blockchain();
            const expectedTransactionMap = {};

            for(let i = 0;i<6;i++){
                const transaction = new Wallet().createTransaction({
                    recipient: 'foo', amount: 20
                })

                transactionPool.setTransaction(transaction);
                if(i%2===0){
                    blockchain.addBlock({data: [transaction]})
                }else{
                    expectedTransactionMap[transaction.id] = transaction;
                }
            }

            transactionPool.clearBlockchainTransactions({chain: blockchain.chain});
            expect(transactionPool.transactionMap).toEqual(expectedTransactionMap);
        })

    })
})