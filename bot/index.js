const Web3 = require('web3')
const { ethers } = require('ethers')
const { BigNumber, utils, constants } = ethers
const { formatBytes32String, parseBytes32String, toUtf8Bytes, hexlify, hexZeroPad } = utils
const snoowrap = require('snoowrap')
const Promise = require('bluebird')
const low = require('lowdb')
const { Client } = require('pg')
const client = new Client({connectionString: process.env.DB_URL})
const FileAsync = require('lowdb/adapters/FileAsync')
const TippingABI = require('../abi/Tipping.json').abi

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

let tips
main()

async function main(){
  await client.connect()
  const db = await low(adapter)
  tips = db.defaults({ tips: [] }).get('tips')
  const startBlock = await tipping.methods.getInitializationBlock().call()
  console.log("startBlock:", startBlock)
  let events = await eventsAfter(startBlock)
  let newEvents = events.filter(unprocessed)
  await Promise.all(newEvents.map(notify))
  tipping.events.Tip({fromBlock:'latest'})
    .on('data', notify)
}

async function eventsAfter(fromBlock){
  return await tipping.getPastEvents('Tip', {fromBlock})
}

function unprocessed({transactionHash}){
  let tip = tips.find({transactionHash}).value()
  return !tip
}

async function notify({transactionHash, returnValues}){
  const {from, to, amount, contentId} = returnValues
  const cid = parseBytes32String(contentId)
  switch (cid.substr(0,3)){
    case "t1_":         // is comment
      await reply(await r.getComment(cid), {from, amount, transactionHash})
      break
    case "t3_":         // is post
      await reply(await r.getSubmission(cid), {from, amount, transactionHash})
      break
    default:
      console.log("no content id")
      break
  }
  await tips.push({transactionHash}).write()
}

async function reply(content, {from, amount, transactionHash}){
  const query = {
    // give the query a unique name
    name: 'fetch-user-from-address',
    text: 'SELECT * FROM users WHERE address = $1',
    values: [from],
  }
  let res = await client.query(query)
  // console.log(res)
  if(res.rows.length)
    from = `u/${res.rows[0].username}`
  else
    from = `${from.slice(0,8)}...`
  let txUrl = process.env.NETWORK === "rinkeby" ? `https://rinkeby.etherscan.io/tx/${transactionHash}` : `https://etherscan.io/tx/${transactionHash}`
  let message = `${from} [tipped](${txUrl}) you ${BigNumber.from(amount).div(constants.WeiPerEther)} donuts!`
  console.log(content, message)
  // return await content.reply(message)
}
