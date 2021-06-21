const { GENESIS_DATA,MINE_RATE } = require('../config');
const Block = require('./block');
const {cryptoHash} = require('../util')
const hexToBinary = require('hex-to-binary');
describe('Block',()=>{
    const timestamp = 2000;
    const lastHash = 'lastfoo-hash';
    const hash = 'foo-hash';
    const data = ['blockchain','data']
    const nonce = 0
    const difficulty = 3
    const block = new Block({timestamp,lastHash,nonce,difficulty,hash,data});

    it('has a timestamp,lasthash,hash and data properties',()=>{
        expect(block.timestamp).toEqual(timestamp);
        expect(block.lastHash).toEqual(lastHash);
        expect(block.data).toEqual(data);
        expect(block.hash).toEqual(hash);
        expect(block.nonce).toEqual(nonce);
        expect(block.difficulty).toEqual(difficulty);
    });

    describe('genesis()',()=>{
        const genesisBlock = Block.genesis();

        it('genesisBlock is an instance Block',()=>{
            expect(genesisBlock instanceof Block).toBe(true);
        });

        it('returns the genesis data',()=>{
            expect(genesisBlock).toEqual(GENESIS_DATA);
        })
    })

    describe('mineBlock()',()=>{
        const lastBlock = Block.genesis();
        const data = 'mined data'
        const minedBlock = Block.mineBlock({lastBlock,data});

        it('returns an instance of Block',()=>{
            expect(minedBlock instanceof Block).toBe(true);
        });

        it('sets `lastHash` to be the `hash` of the lastBlock',()=>{
            expect(minedBlock.lastHash).toEqual(lastBlock.hash);
        });

        it('sets `data`',()=>{
            expect(minedBlock.data).toEqual(data);
        })

        it('sets `timestamp`',()=>{
            expect(minedBlock.timestamp).not.toEqual(undefined);
        })

        it('creates a SHA-256 `hash` based on the proper inputs',()=>{
            expect(minedBlock.hash).toEqual(cryptoHash(minedBlock.timestamp,lastBlock.hash,data,minedBlock.nonce,minedBlock.difficulty ));
        })

        it('sets a `hash` thats meets difficulty criteria',()=>{
            expect(hexToBinary(minedBlock.hash).substring(0,minedBlock.difficulty)).toEqual('0'.repeat(minedBlock.difficulty))
        })

        it('adjusts the difficulty',()=>{
            const possibleResults = [lastBlock.difficulty + 1,lastBlock.difficulty - 1]
            expect(possibleResults.includes(minedBlock.difficulty)).toBe(true);
        })
    })

    describe('adjustDifficulty()',()=>{
        it('raises difficulty as block is mined quickly',()=>{
            expect(Block.adjustDifficulty({
                originalBlock: block, timestamp: block.timestamp + MINE_RATE - 100
            })).toEqual(block.difficulty + 1)
        })

        it('reduces difficulty as block is mined late',()=>{
            expect(Block.adjustDifficulty({
                originalBlock: block, timestamp: block.timestamp + MINE_RATE + 100
            })).toEqual(block.difficulty - 1)
        })
    })
});