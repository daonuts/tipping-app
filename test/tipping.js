const Tipping = artifacts.require("Tipping");
const ethers = require('ethers');
const { utils } = ethers
const { formatBytes32String, parseBytes32String, toUtf8Bytes, hexlify, hexZeroPad, bigNumberify } = utils

contract('Tipping', (accounts) => {

  context('extract tip parameters', async () => {

    let tipping

    before(async () => {
        tipping = await Tipping.new()
    })

    it('extract tip parameters', async () => {
      const decimals = "1000000000000000000"
      const amount = bigNumberify(1000).mul(decimals)
      const recipient = hexZeroPad(hexlify("0x8401Eb5ff34cc943f096A32EF3d5113FEbE8D4Eb"),32)
      const contentId = formatBytes32String("t3_cmjqva") //hexZeroPad(hexlify(toUtf8Bytes("t3_cmjqva")),32)
      // console.log(hexlify(contentId))
      const args = "0x" + [
        hexlify(1),   // 1 = tip
        recipient,
        contentId
      ].map(a=>a.substr(2)).join("")
      console.log(args)

      const params = await tipping.extractTipParameters(args)
      console.log(params)
      console.log(parseBytes32String(params.contentId))

      // assert.equal(controller, accounts[0], "token controller wasn't first account");
    });

  })

});
