import 'core-js/stable'
import 'regenerator-runtime/runtime'
import AragonApi from '@aragon/api'

const api = new AragonApi()
let account

api.store(
  async (state, event) => {
    let newState

    switch (event.event) {
      case 'ACCOUNTS_TRIGGER':
        account = event.returnValues.account
        newState = state
        break
      case 'Tip':
        if(!state.tips.find(t=>t.eventId===event.id)){
          let newTip = Object.assign(event.returnValues, {eventId:event.id})
          let tips = state.tips.slice(0)
          tips.unshift(newTip)
          return { ...state, tips }
        }
      default:
        newState = state
    }

    return newState
  },
  {
    init: async function(cachedState){
      return {
        tips: [],
        ...cachedState
      }
    }
  }
)
