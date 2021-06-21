const Block = require("./block");
const { GENESIS_DATA, REWARD_INPUT, MINING_REWARD } = require("../config");
const {cryptoHash} = require("../util");
const Transaction = require('../wallet/transaction')
const Wallet = require('../wallet')
class Blockchain{
    constructor(){
        this.chain = [Block.genesis()];
    }

    addBlock({data}){
        
        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length - 1],
            data
        })

        this.chain.push(newBlock);
    }

    static isValidChain(chain){
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) return false;
        for(let i =1;i<chain.length;i++){
            if(chain[i].lastHash !== chain[i - 1].hash){
                return false
            }
            if(chain[i].hash !== cryptoHash(chain[i].timestamp,chain[i].lastHash,chain[i].data,chain[i].difficulty,chain[i].nonce)){
                return false
            }
            if((chain[i - 1].difficulty - chain[i].difficulty) > 1 ){
                return false
            }
        }
        return true
    }

    replaceChain(chain, validateTransactions, onSuccess){
        if(chain.length <= this.chain.length){
            console.error('the incoming chain must be longer')
            return;
        }
        if(!Blockchain.isValidChain(chain)){
            console.error('invalid chain');
            return;
        }
        if(validateTransactions && !this.validTransactionData({chain})){
            console.error('the incoming chain has invalid data')
            return;
        }
        if(onSuccess) onSuccess();
        console.log('replacing chain with', chain)
        this.chain = chain;
    }

    validTransactionData({chain}){
        for(let i = 0;i<chain.length;i++){
            let block = chain[i]
            let rewardCount = 0;
            const transactionSet = new Set()
            for(let transaction of block.data){
                if(transaction.input === REWARD_INPUT){
                    rewardCount++
                    if(rewardCount > 1){
                        console.error('Miner rewards exceed limit');
                        return false
                    }
                    if(Object.values(transaction.outputMap)[0] !== MINING_REWARD){
                        console.error('Mining reward amount is invalid');
                        return false
                    }
                }else{
                    if(!Transaction.validTransaction(transaction)){
                        console.error('Invalid transaction');
                        return false
                    }

                    const trueBalance = Wallet.calculateBalance({
                        chain: this.chain,
                        address: transaction.input.address
                    })

                    if(transaction.input.amount !== trueBalance){
                        console.error('Invalid input amount');
                        return false;
                    }

                    if(transactionSet.has(transaction)){
                        console.error('An identical transaction appears more than once in the block');
                        return false;
                    }else{
                        transactionSet.add(transaction)
                    }
                }
            }
        }
        return true
    }
}

module.exports = Blockchain