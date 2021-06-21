const Blockchain = require('./index');
const Block = require('./block');
const {cryptoHash} = require('../util');
const Wallet = require('../wallet')
const Transaction = require('../wallet/transaction')


describe('Blockchain',()=>{
    let blockchain,newChain,originalChain
    beforeEach(()=>{
        blockchain = new Blockchain();
        newChain = new Blockchain();
        originalChain = blockchain
        
    });

    it("contains a `chain` array instance", ()=>{
        expect(blockchain.chain instanceof Array).toBe(true);
    })

    it('starts with genesis block',()=>{
        expect(blockchain.chain[0]).toEqual(Block.genesis());
    })

    it('adds a new block to the chain',()=>{
        const newData = 'foo bar'
        blockchain.addBlock({data: newData});

        expect(blockchain.chain[blockchain.chain.length - 1].data).toEqual(newData);
    })

    describe('isValidChain()',()=>{
        describe('when chain does not start with genesis block',()=>{
            it('returns false',()=>{
                blockchain.chain[0] = {data: 'fake'}
                expect(Blockchain.isValidChain(blockchain.chain)).toBe(false)
            })
        })

        describe('when genesis block is there with multiple blocks',()=>{
            beforeEach(()=>{
                blockchain.addBlock({data: 'boots'})
                blockchain.addBlock({data: 'beets'})
                blockchain.addBlock({data: 'lol'})
            })
            describe('has lastHash reference changed',()=>{
                it('returns false',()=>{
                    blockchain.chain[2].lastHash = 'broken'
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false)
                })
            }) 
            describe('and chain contains a block with invalid content',()=>{
                it('returns false',()=>{
                    blockchain.chain[2].data = 'broken-data'
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false)
                })
            })
            describe('and the chain contains a block with jumped difficulty',()=>{
                it('returns false',()=>{
                    const lastBlock = blockchain.chain[blockchain.chain.length - 1]
                    const lastHash = lastBlock.hash
                    const timestamp = Date.now()
                    const nonce = 0
                    const data = []
                    const difficulty =  lastBlock.difficulty - 3
                    const hash = cryptoHash(timestamp,lastHash,difficulty,nonce,data)

                    const badBlock = new Block({
                        timestamp,lastHash,difficulty,nonce,data,hash
                    })
                    blockchain.chain.push(badBlock)

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false)
                })
            })
            describe('chain does not contain any invalid block',()=>{
                it('returns true',()=>{
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(true)
                });
            });

        });
    });

    describe('replaceChain()',()=>{
        let logMock,errorMock
        beforeEach(()=>{
            errorMock = jest.fn()
            global.console.error = errorMock;
            logMock = jest.fn()
            global.console.log = logMock;
        });
        describe('when the new chain is not longer',()=>{
            beforeEach(()=>{
                newChain.chain[0] = {new: 'chain'}
                blockchain.replaceChain(newChain.chain)
            })
            it('does not replace the chain',()=>{
                expect(blockchain.chain).toEqual(originalChain.chain)
            })

            it('logs an error',()=>{
                expect(errorMock).toHaveBeenCalled();
            })
        })

        describe('when the new chain is longer',()=>{
            beforeEach(()=>{
                newChain.addBlock({data: 'boots'})
                newChain.addBlock({data: 'beets'})
                newChain.addBlock({data: 'lol'})
            })
            describe('when the chain is not valid',()=>{
                beforeEach(()=>{
                    newChain.chain[2] = {lastHash: 'broken-hash'}   
                    blockchain.replaceChain(newChain.chain)
                })
                it('it does not replace the chain',()=>{
                    expect(blockchain.chain).toEqual(originalChain.chain)
                })

                it('logs an error',()=>{
                    expect(errorMock).toHaveBeenCalled();
                })
            })

            describe('when the chain is valid',()=>{

                beforeEach(()=>{
                    blockchain.replaceChain(newChain.chain)
                })
                it('replaces the chain',()=>{
                    expect(blockchain.chain).toEqual(newChain.chain)
                });
                it('logs a chain replacement',()=>{
                    expect(logMock).toHaveBeenCalled();
                })
            })

        })


    })

    describe('validTransactionData()',()=>{
        let transaction, wallet, rewardTransaction, chain, errorMock ;

        beforeEach(()=>{
            wallet = new Wallet()
            transaction = wallet.createTransaction({recipient: 'foo-address',amount: 65})
            rewardTransaction = Transaction.rewardTransaction({minerWallet: wallet})
            chain = newChain.chain
            errorMock = jest.fn()
            global.console.error = errorMock;
        })

        describe('and the transaction data is valid',()=>{
            it('it returns true',()=>{
                newChain.addBlock({data: [transaction, rewardTransaction]})
                expect(blockchain.validTransactionData({chain})).toBe(true)
            })
        })

        describe('and the transaction data has multiple reward',()=>{
            it('returns false',()=>{
                newChain.addBlock({data: [transaction, rewardTransaction, rewardTransaction]})

                expect(blockchain.validTransactionData({chain})).toBe(false)
                expect(errorMock).toHaveBeenCalled();
            })
        })

        describe('and the transaction has malformed atleast one output map',()=>{
            describe('and the transaction is not a reward transaction',()=>{
                it('returns false',()=>{
                    transaction.outputMap[wallet.publicKey] = 99999
                    newChain.addBlock({data: [transaction, rewardTransaction]})

                    expect(blockchain.validTransactionData({chain})).toBe(false)
                    expect(errorMock).toHaveBeenCalled();
                })
            })

            describe('transaction is a reward transaction',()=>{
                it('returns false',()=>{
                    rewardTransaction.outputMap[wallet.publicKey] = 99999
                    newChain.addBlock({data: [transaction, rewardTransaction]})

                    expect(blockchain.validTransactionData({chain})).toBe(false)
                    expect(errorMock).toHaveBeenCalled();
                })
            })
        })

        describe('and the transaction has atleast one malformed input',()=>{
            it('returns false',()=>{
                wallet.balance = 9000

                const evilOutputMap = {
                    [wallet.publicKey] : 8900,
                    fooRecipient: 100
                }

                const evilTransaction = {
                    input: {
                        timestamp: Date.now(),
                        amount: wallet.balance,
                        address: wallet.publicKey,
                        signature: wallet.sign(evilOutputMap)
                    },
                    outputMap: evilOutputMap
                }

                newChain.addBlock({data: [evilTransaction, rewardTransaction]})

                expect(blockchain.validTransactionData({chain})).toBe(false)
                expect(errorMock).toHaveBeenCalled();
            })
        })

        describe('and a block contains multiple identical transactions',()=>{
            it('returns false',()=>{
                newChain.addBlock({data: [transaction, transaction, transaction, rewardTransaction]})

                expect(blockchain.validTransactionData({chain: newChain.chain})).toBe(false)
                expect(errorMock).toHaveBeenCalled();
            })
        })

    })
});