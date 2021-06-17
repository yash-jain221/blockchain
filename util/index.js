const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const cryptoHash = require('../util/crypto-hash')

const verifySignature = ({publicKey,data,signature})=>{
    const msgHash = cryptoHash(data);
    const key = ec.keyFromPublic(publicKey,'hex')
    return key.verify(msgHash,signature)
}
module.exports = {ec,verifySignature,cryptoHash}