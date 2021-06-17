const {v1: uuid} = require('uuid');
const { REWARD_INPUT, MINING_REWARD } = require('../config');
const {verifySignature} = require('../util')
class Transaction{
    constructor({senderWallet,recipient,amount,outputMap,input}){
        this.id = uuid();
        this.outputMap = outputMap ||  this.createOutputMap({senderWallet,recipient,amount})
        this.input = input || this.createInput({senderWallet})
    }

    createOutputMap({senderWallet,recipient,amount}){
        const outputMap = {};

        outputMap[recipient] = amount;
        outputMap[senderWallet.publicKey] = senderWallet.balance - amount;

        return outputMap
    }

    createInput({senderWallet}){
        const input = {
            timestamp: Date.now(),
            amount:senderWallet.balance,
            address: senderWallet.publicKey,
            signature: senderWallet.sign(this.outputMap)
        }
        return input
    }

    static validTransaction(transaction){
        const {input:{signature,amount,address},outputMap} = transaction;
        const outputTotal = Object.values(outputMap).reduce((total,outputMapAmount)=>total + outputMapAmount);
        if(outputTotal !== amount){
            console.error(`invalid transaction from ${address}`)
            return false
        }
        if(!verifySignature({publicKey: address,data: outputMap,signature})){
            console.error(`invalid signature from ${address}`)
            return false;
        }
        return true;
    }

    update({senderWallet,recipient,amount}){
        if(amount > this.outputMap[senderWallet.publicKey]){
            throw new Error("Amount exceeds balance")
        }
        if(!this.outputMap[recipient]){
            this.outputMap[recipient] =  amount;
        }
        else{
            this.outputMap[recipient] = this.outputMap[recipient] + amount;
        }
        this.outputMap[senderWallet.publicKey] = this.outputMap[senderWallet.publicKey] - amount
        this.input = this.createInput({senderWallet})
    }

    static rewardTransaction({minerWallet}){
        
        return new this({
            outputMap: {[minerWallet.publicKey] : MINING_REWARD},
            input: REWARD_INPUT
        })
    }
}

module.exports = Transaction