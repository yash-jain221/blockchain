const express = require('express');
const request = require('request')
const Blockchain = require('./blockchain/index');
const bodyParser = require('body-parser');
const PubSub = require('./app/pubsub')
const TransactionPool = require('./wallet/transaction-pool')
const Wallet = require('./wallet');
const Transaction = require('./wallet/transaction');
const TransactionMiner = require('./app/transaction-miner');

const app = express()
const blockchain = new Blockchain()
const transactionPool = new TransactionPool()
const wallet = new Wallet() 
const pubsub = new PubSub({blockchain,transactionPool})
const transactionMiner = new TransactionMiner({blockchain,transactionPool,wallet,pubsub})

const DEFAULT_PORT = 3000
const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`

//setTimeout(()=> pubsub.broadcastChain(),1000)

app.use(bodyParser.json())
//integrate learning algorithm in difficulty management.
app.get('/api/blocks',(req,res)=>{
    res.json(blockchain.chain);
});

app.post('/api/mine',(req,res)=>{
    const {data} = req.body;
    blockchain.addBlock({data});
    pubsub.broadcastChain();
    res.redirect('/api/blocks');
})

app.post('/api/transact',(req,res)=>{
    const {amount, recipient} = req.body;
    let transaction = transactionPool.existingTransaction({inputAddress:wallet.publicKey});
    try{
        if(transaction){
            transaction.update({senderWallet: wallet,recipient,amount})
        }else{
            transaction = wallet.createTransaction({amount,recipient,chain: blockchain.chain})
        }
    }catch(error){
        return res.status(400).json({type: "error",message: error.message})
    }
    transactionPool.setTransaction(transaction);
    pubsub.broadcastTransaction(transaction);
    res.json({type:"success",transaction});
})

app.get('/api/transaction-pool-map',(req,res)=>{
    res.json(transactionPool.transactionMap);
})

app.get('/api/mine-transactions',(req,res)=>{
    transactionMiner.mineTransactions()
    res.redirect('/api/blocks');
})

const syncChains = ()=>{
    request({url: `${ROOT_NODE_ADDRESS}/api/blocks`},(error, response, body)=>{
        if(!error && response.statusCode === 200){
            const rootChain = JSON.parse(body)

            console.log('replace chain on a sync with', rootChain);
            blockchain.replaceChain(rootChain);
        }
    })
}
const syncTransactionPoolMap = ()=>{
    request({url: `${ROOT_NODE_ADDRESS}/api/transaction-pool-map`},(error, response, body)=>{
        if(!error && response.statusCode === 200){
            const  transactionPoolMap = JSON.parse(body)

            console.log('syncing to TransactionPoolMap');
            transactionPool.transactionMap = transactionPoolMap
        }
    })
}

let PEER_PORT;

if(process.env.GENERATE_PEER_PORT === 'true'){
    PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random() * 1000)
}

const port = PEER_PORT || DEFAULT_PORT
app.listen(port,()=>{
    console.log(`server is listening at ${port}`)
 if(port !== DEFAULT_PORT){
    syncChains()
    syncTransactionPoolMap()
 }
})