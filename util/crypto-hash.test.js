const cryptoHash = require('./crypto-hash');

describe('cryptoHash()',()=>{
    
    it('generates a SHA-256 hashed output',()=>{
        expect(cryptoHash('foo')).toEqual('b2213295d564916f89a6a42455567c87c3f480fcd7a1c15e220f17d7169a790b');
    });

    it('order doesnt matter',()=>{
        expect(cryptoHash('one','two','three')).toEqual(cryptoHash('two','three','one'));
    });

    it('gives a unique hash when the properties have been changed',()=>{
        const foo = {}
        const orgHash = cryptoHash(foo)
        foo['a'] = 'a'
        
        expect(cryptoHash(foo)).not.toEqual(orgHash)
    })
})