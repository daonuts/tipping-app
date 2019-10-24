import React, { useState, useEffect } from 'react'
import { useAragonApi } from '@aragon/api-react'
import {
  AppBar, AppView, Button, Card, CardLayout, Checkbox, Field, GU, Header, IconSettings,
  Info, Main, Modal, SidePanel, Text, TextInput, theme
} from '@aragon/ui'
import BigNumber from 'bignumber.js'
import bases from 'bases'
import { getPublicAddress as getPublicAddressTorus } from './torusUtils'

const types = ["NONE", "COMMENT", "POST"]

function App() {
  const { api, network, appState, connectedAccount } = useAragonApi()
  const { count, tips = [], syncing } = appState

  const [username, setUsername] = useState('')
  useEffect(()=>{
  }, [connectedAccount])

  const [proxy, setProxy] = useState('https://cors-anywhere.herokuapp.com/')
  const [recipient, setRecipient] = useState('')
  const [cid, setCid] = useState('')
  const [ctype, setCtype] = useState(0)
  const [owner, setOwner] = useState('')
  const [url, setUrl] = useState('')
  const [amount, setAmount] = useState(0)

  useEffect(()=>{
    if(!url) {
      setCid('')
      setCtype(0)
      setRecipient('')
      return
    }

    let cid='', ctype=0, tnum=0;

    try {
      let parts = (new URL(url)).pathname.split("/").filter(a=>(!!a))
      if(parts.length === 6) {
        ctype = 1         // comment
        cid = parts[5]
        tnum = 1
      } else if(parts.length === 5) {
        ctype = 2         // post
        cid = parts[3]
        tnum = 3
      }
    } catch(e) {}

    console.log(url)

    setCid(cid)
    setCtype(ctype)
    setRecipient('')

    async function setRecipientFromContent(tnum, cid) {
      let content = await fetch(`${proxy}https://www.reddit.com/api/info.json?id=t${tnum}_${cid}`).then(r=>r.json())
      let recipient = content.data.children[0].data.author
      setRecipient(recipient)
    }

    if(ctype){
      setRecipientFromContent(tnum, cid)
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
      <Text size="large">You are tipping {amount} to {recipient} {cid ? `for ${types[ctype]}:${cid}` : ''}</Text>

      <Field label="Amount:">
        <Button mode="strong" emphasis="positive" onClick={()=>submitTip(api, recipient, amount, ctype, cid)}>Tip</Button>
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

async function submitTip(api, recipient, amount, ctype, cid){
  const cidInt = bases.fromBase36(cid)

  let value = web3.toBigNumber(amount).mul("1e+18").toFixed()

  console.log(cid, ctype, value)

  let tokenAddress = await api.call('currency').toPromise()

  console.log(tokenAddress)

  let intentParams = {
    token: { address: tokenAddress, value,
      // hard code to prevent metamask gas estimation
      // max gas cost ~120k when tipping to non-reg user + some extra
      gas: 150000
    }
  }

  const to = await getPublicAddressTorus({verifier:"reddit", verifierId: recipient})

  // api.tip(recipient, value, ctype, cidInt.toString(), intentParams)
  await api.tip(to, value, ctype, cidInt.toString(), intentParams).toPromise()
}

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
      <li>{`${tip.fromName} TIPPED ${tip.toName} ${web3.toBigNumber(tip.amount).div("1e+18").toFixed()} for ${types[tip.ctype]}:${bases.toBase36(tip.cid)}`}</li>
    )
  });
  return (
    <ul>{listItems}</ul>
  );
}
