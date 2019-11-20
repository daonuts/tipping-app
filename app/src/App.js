import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AppBar, AppView, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconSettings,
  Info, Main, Modal, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import BigNumber from 'bignumber.js'
import bases from 'bases'
import { getPublicAddress as getPublicAddressTorus } from './torusUtils'
import {abi as TokenABI} from '../../abi/Token.json'
import { ethers } from 'ethers'

const types = ["NONE", "COMMENT", "POST"]

function App() {
  const { api, network, appState, connectedAccount } = useAragonApi()
  const { count, tips = [], syncing } = appState

  const [username, setUsername] = useState('')
  useEffect(()=>{
  }, [connectedAccount])

  const [proxy, setProxy] = useState('https://cors-anywhere.herokuapp.com/')
  const [recipient, setRecipient] = useState('')
  const [contentId, setCid] = useState('')
  // const [ctype, setCtype] = useState(0)
  const [owner, setOwner] = useState('')
  const [url, setUrl] = useState('')
  const [amount, setAmount] = useState(0)

  useEffect(()=>{
    if(!url) {
      setCid('')
      // setCtype(0)
      setRecipient('')
      return
    }

    let id='', tnum=0;

    try {
      let parts = (new URL(url)).pathname.split("/").filter(a=>(!!a))
      if(parts.length === 6) {
        id = parts[5]
        tnum = 1
      } else if(parts.length === 5) {
        id = parts[3]
        tnum = 3
      }
    } catch(e) {}

    console.log(url)

    setCid(`t${tnum}_${id}`)
    // setCtype(ctype)
    setRecipient('')

    async function setRecipientFromContent(tnum, id) {
      let content = await fetch(`${proxy}https://www.reddit.com/api/info.json?id=t${tnum}_${id}`).then(r=>r.json())
      let recipient = content.data.children[0].data.author
      setRecipient(recipient)
    }

    if(tnum){
      setRecipientFromContent(tnum, id)
    }
  }, [url, proxy])

  return (
    <Main>
      <Header primary="Tip" />
      <Text size="xxlarge">Tip direct:</Text>
      <Text size="large">recipient will be notified by direct message.</Text>
      <Field label="Recipient:">
        <TextInput placeholder="username" value={recipient} onChange={(e)=>setRecipient(e.target.value)} />
      </Field>
      <Text size="xxlarge">Tip for content:</Text>
      <Text size="large">recipient will be notified by comment reply.</Text>
      <Field label="Content Url:">
        <TextInput placeholder="https://www.reddit.com/full_path_to_comment_or_post" value={url} onChange={(e)=>setUrl(e.target.value)} />
      </Field>
      <Field label="Amount:">
        <TextInput type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} />
      </Field>
      <Text size="large" color={theme.textTertiary}>This app retrieves the recipient using a proxy to the Reddit api. Check the following reflects your intent. You can also change the proxy below.</Text>
      <Text size="large">You are tipping {amount} to {recipient} {contentId ? `for ${contentId}` : ''}</Text>

      <Field label="Amount:">
        <Button mode="strong" emphasis="positive" onClick={()=>submitTip(api, recipient, amount, contentId)}>Tip</Button>
      </Field>
      <hr />
      <Field label="Proxy:">
        <TextInput value={proxy} onChange={(e)=>setProxy(e.target.value)} />
      </Field>
      <hr />
      <TipList tips={tips} />
    </Main>
  )
}

async function submitTip(api, recipient, amount, contentId){
  const { utils } = ethers
  const { formatBytes32String, parseBytes32String, toUtf8Bytes, hexlify, hexZeroPad, bigNumberify } = utils

  const decimals = "1000000000000000000"

  let value = bigNumberify(amount).mul(decimals);     //    web3.toBigNumber(amount).mul("1e+18").toFixed()

  console.log(contentId, value)

  let tokenAddress = await api.call('currency').toPromise()

  const torusAddress = await getPublicAddressTorus({verifier:"reddit", verifierId: recipient})

  const recipientAddress = hexZeroPad(hexlify(torusAddress),32)
  contentId = formatBytes32String(contentId) //hexZeroPad(hexlify(toUtf8Bytes("t3_cmjqva")),32)
  // console.log(hexlify(contentId))
  const args = "0x" + [
    hexlify(1),   // 1 = tip
    recipientAddress,
    contentId
  ].map(a=>a.substr(2)).join("")
  console.log(args)

  const { appAddress } = await api.currentApp().toPromise()
  console.log(appAddress)
  const token = api.external(tokenAddress, TokenABI)
  console.log(token)

  console.log(await api.call("extractTipParameters", args).toPromise())
  const tx = await token.send(appAddress, value.toString(), args).toPromise()
  console.log(tx)

}

// async function submitTip(api, recipient, amount, ctype, cid){
//   const cidInt = bases.fromBase36(cid)
//
//   let value = web3.toBigNumber(amount).mul("1e+18").toFixed()
//
//   console.log(cid, ctype, value)
//
//   let tokenAddress = await api.call('currency').toPromise()
//
//   console.log(tokenAddress)
//
//   let intentParams = {
//     token: { address: tokenAddress, value,
//       // hard code to prevent metamask gas estimation
//       // max gas cost ~120k when tipping to non-reg user + some extra
//       gas: 150000
//     }
//   }
//
//   const to = await getPublicAddressTorus({verifier:"reddit", verifierId: recipient})
//
//   // api.tip(recipient, value, ctype, cidInt.toString(), intentParams)
//   await api.tip(to, value, ctype, cidInt.toString(), intentParams).toPromise()
// }

export default App

function Welcome({username}) {
  return (
    <div>
      <Text.Block style={{ textAlign: 'center' }} size='large'>welcome, </Text.Block>
      <Text.Block style={{ textAlign: 'center' }} size='xxlarge'>{username}</Text.Block>
    </div>
  )
}

function Claim({balance, claim}) {
  return (
    <Field label="Claim tips:">
      <Button mode="strong" emphasis="positive" onClick={claim}>Claim</Button>
      <Info.Action style={{"margin-top": "10px"}}>You have {balance} in tips to claim (you were tipped before registering)</Info.Action>
    </Field>
  )
}

function TipList({tips}) {
  const listItems = tips.map((tip) => {
    console.log(tip)
    return (
      <li>{`${tip.fromName} TIPPED ${tip.toName} ${web3.toBigNumber(tip.amount).div("1e+18").toFixed()} for ${bases.toBase36(tip.contentId)}`}</li>
    )
  });
  return (
    <ul>{listItems}</ul>
  );
}
