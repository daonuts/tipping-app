const Web3 = require('web3')
const { ethers } = require('ethers')
const { BigNumber, utils, constants } = ethers
const { toUtf8String, hexStripZeros, defaultAbiCoder, hexDataSlice, Fragment, Interface, formatBytes32String, parseBytes32String, toUtf8Bytes, hexlify, hexZeroPad } = utils
const snoowrap = require('snoowrap')
const Promise = require('bluebird')
const low = require('lowdb')
const { Pool } = require('pg')
const pool = new Pool({connectionString: process.env.DB_URL})
const FileAsync = require('lowdb/adapters/FileAsync')
const TippingABI = require('../abi/Tipping.json').abi
const TokenABI = require('../abi/Token.json').abi

const adapter = new FileAsync('db.json')
const r = new snoowrap({
  userAgent: 'daonuts 1.0 by u/daonuts',
  clientId: process.env.REDDIT_SCRIPT_CLIENT_ID,
  clientSecret: process.env.REDDIT_SCRIPT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD
})
const web3 = new Web3(`wss://${process.env.NETWORK}.infura.io/ws/v3/${process.env.INFURA_PROJECT_ID}`)

const tipping = new web3.eth.Contract(TippingABI, process.env.TIPPING_ADDRESS)
const token = new web3.eth.Contract(TokenABI, process.env.TOKEN_ADDRESS)


let redditTipV1Frag = Fragment.from({
    "inputs": [
      {
        "name": "contentId",
        "type": "bytes12"
      }
    ],
    "name": "redditTipV1",
    "type": "function"
})
let ifaceV1 = new Interface([redditTipV1Frag])

let tips
main()

async function main(){
  const db = await low(adapter)
  tips = db.defaults({ tips: [] }).get('tips')
  const startBlock = await tipping.methods.getInitializationBlock().call()
  console.log("startBlock:", startBlock)
  let events = await eventsAfter(startBlock)
  let newEvents = events.filter(unprocessed)
  await Promise.all(newEvents.map(notify))
  // tipping.events.Tip({fromBlock:'latest'})
  //   .on('data', notify)
  token.events.Sent({fromBlock:'latest'})
    .on('data', notify)
}

async function eventsAfter(fromBlock){
  // return await tipping.getPastEvents('Tip', {fromBlock})
  return await token.getPastEvents('Sent', {fromBlock})
}

function unprocessed({transactionHash}){
  let tip = tips.find({transactionHash}).value()
  return !tip
}

async function notify({transactionHash, returnValues}){
  // const {from, to, amount, contentId} = returnValues
  const {_operator, _from, _to, _amount, _data, _operatorData} = returnValues
  let contentId

  try {
    const decoded = ifaceV1.decodeFunctionData(redditTipV1Frag, _data)
    contentId = toUtf8String(hexStripZeros(decoded.contentId))
  } catch(e){
    return
  }

  console.log(contentId)

  switch (contentId.substr(0,3)){
    case "t1_":         // is comment
      await reply(await r.getComment(contentId), {_from, _amount, transactionHash})
      break
    case "t3_":         // is post
      await reply(await r.getSubmission(contentId), {_from, _amount, transactionHash})
      break
    default:
      console.log("no content id")
      break
  }
  await tips.push({transactionHash}).write()
}

async function reply(content, {_from, _amount, transactionHash}){
  const client = await pool.connect()
  const query = {
    // give the query a unique name
    name: 'fetch-user-by-address',
    text: 'SELECT * FROM users WHERE address ILIKE $1',
    values: [_from],
  }
  let res = await client.query(query)
  client.release()
  // console.log(res)
  if(res.rows.length)
    _from = `u/${res.rows[0].username}`
  else
    _from = `${_from.slice(0,8)}...`
  let txUrl = process.env.NETWORK === "rinkeby" ? `https://rinkeby.etherscan.io/tx/${transactionHash}` : `https://etherscan.io/tx/${transactionHash}`
  let message = `${_from} [tipped](${txUrl}) you ${BigNumber.from(_amount).div(constants.WeiPerEther)} donuts!`
  console.log(content, message)
  try {
    await content.reply(message)
  } catch(e){
    console.log(e)
  }
  return
}
