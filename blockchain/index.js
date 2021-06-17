const Block = require("./block");
const { GENESIS_DATA } = require("../config");
const {cryptoHash} = require("../util");

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

    replaceChain(chain,onSuccess){
        if(chain.length <= this.chain.length){
            console.error('the incoming chain must be longer')
            return;
        }
        if(!Blockchain.isValidChain(chain)){
            console.error('invalid chain');
            return;
        }

        if(onSuccess) onSuccess();
        console.log('replacing chain with', chain)
        this.chain = chain;
    }
}

module.exports = Blockchain