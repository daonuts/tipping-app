import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AppBar, AppView, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconSettings,
  Info, Paragraph, Main, Modal, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import BigNumber from 'bignumber.js'
import { getPublicAddress as getPublicAddressTorus } from './torusUtils'
import {abi as TokenABI} from '../../abi/Token.json'
import { ethers } from 'ethers'
const { utils } = ethers

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
  const [disabled, setDisabled] = useState(true)

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
      <Text size="xxlarge">Tip direct (recipient will be notified by direct message):</Text>
      <Field label="Recipient:">
        <TextInput placeholder="username" value={recipient} onChange={(e)=>setRecipient(e.target.value)} />
      </Field>
      <Text size="xxlarge">Tip for content (recipient will be notified by comment reply):</Text>
      <Field label="Content Url:">
        <TextInput placeholder="https://www.reddit.com/full_path_to_comment_or_post" value={url} onChange={(e)=>setUrl(e.target.value)} />
      </Field>
      <Field label="Amount:">
        <TextInput type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} />
      </Field>
      <p><Text size="large" color={theme.textTertiary}>This app retrieves the recipient using a proxy to the Reddit api. Check the following reflects your intent. You can also change the proxy below.</Text></p>
      <p><Text size="large">You are tipping {amount} to {recipient} {contentId ? `for ${contentId}` : ''}</Text></p>
      <Info.Alert style={{"marginBottom": "10px"}}>This interface currently looks up and uses the Torus address for the Reddit username (and not the r/ethtrader registered address which is likely what you would expect).<Button mode="strong" onClick={()=>setDisabled(false)}>Enable anyway</Button></Info.Alert>
      <Field label="Amount:">
        <Button mode="strong" emphasis="positive" disabled={disabled} onClick={()=>submitTip(api, recipient, amount, contentId)}>Tip</Button>
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

export default App

function TipList({tips}) {
  const listItems = tips.map((tip) => {
    console.log(tip)
    return (
      <li><Text>{`${tip.from} TIPPED  ${tip.to} ${web3.toBigNumber(tip.amount).div("1e+18").toFixed()} for ${utils.parseBytes32String(tip.contentId)}`}</Text></li>
    )
  });
  return (
    <ul>{listItems}</ul>
  );
}
