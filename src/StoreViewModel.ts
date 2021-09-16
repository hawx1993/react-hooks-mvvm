import { SetStateAction, useState, Dispatch, useEffect } from 'react'
import isEqual from 'react-fast-compare'

export enum GLOBAL_KEYS {}

const INCOMING_STORE_KEY = 'INCOMING_STORE_KEY'
type StateUpdater<ValueType> = (value: ValueType) => void

const globalStore = new Map()
const incomingStore = new Map()

// TODO: add useLocalStore for persist data

class StoreViewModel<P = {}> {
  props: P
  constructor(props: P) {
    this.props = props
  }
  private _setStoreValue = <ValueType>(
    key: GLOBAL_KEYS,
    defaultValue?: ValueType
  ) => {
    if (!globalStore.has(key)) {
      globalStore.set(key, {
        value: defaultValue,
        updaters: new Set<Dispatch<SetStateAction<GLOBAL_KEYS>>>(),
      })
    }
  }

  private _getStoreValue = <ValueType>(
    key: GLOBAL_KEYS,
    defaultValue?: ValueType
  ) => {
    this._setStoreValue(key, defaultValue)
    return globalStore.get(key)
  }
  private _updatedStoreValue = <ValueType>(
    key: GLOBAL_KEYS,
    value: ValueType
  ) => {
    const current = this._getStoreValue(key)
    if (isEqual(current.value, value)) return
    globalStore.set(key, {
      value: {
        ...current.value,
        ...value,
      },
      updaters: current.updaters,
    })
    current.value = value
  }
  private _setDefaultValue = <ValueType>(
    key: GLOBAL_KEYS,
    value?: ValueType
  ) => {
    const current = this._getStoreValue(key)
    if (current.value === undefined && value !== undefined) {
      this._updatedStoreValue(key, value)
    }
  }
  private _emitUpdate = <ValueType = any>(key: GLOBAL_KEYS) => {
    const current = this._getStoreValue<ValueType>(key)
    current.updaters.forEach(
      (listener: Dispatch<SetStateAction<GLOBAL_KEYS>>) => {
        listener(current.value)
      }
    )
  }
  public updateStoreByKey = <ValueType = any>(
    key: GLOBAL_KEYS,
    incomingValue: ValueType
  ) => {
    const lastIncomingValue = incomingStore.get(INCOMING_STORE_KEY)
    if (!isEqual(lastIncomingValue, incomingValue)) {
      incomingStore.set(INCOMING_STORE_KEY, incomingValue)
    } else {
      return
    }
    this._updatedStoreValue<ValueType>(key, incomingValue)
    this._emitUpdate<ValueType>(key)
  }
  private _getStateUpdater = <ValueType>(
    key: GLOBAL_KEYS
  ): StateUpdater<ValueType> => {
    return (incomingValue: ValueType) => {
      this.updateStoreByKey<ValueType>(key, incomingValue)
    }
  }
  public useGlobalStore = <State>(key: GLOBAL_KEYS, initialState?: State) => {
    this._setDefaultValue(key, initialState)
    const current = this._getStoreValue(key, initialState)
    const state = useState(current.value)
    const listeners = {} as {
      [StateKey in GLOBAL_KEYS]: Set<Dispatch<SetStateAction<GLOBAL_KEYS>>>
    }
    globalStore.forEach((value, key: GLOBAL_KEYS) => {
      listeners[key] = new Set()
    })
    useEffect(() => {
      const cleanup = () => {
        console.log(`cleaning ${key} store...`)
        listeners[key].delete(state[1])
      }
      return cleanup
    }, [])
    current.updaters.add(state[1])
    return [current?.value || {}, this._getStateUpdater(key)]
  }
  public getStoreValueByKey = (key: GLOBAL_KEYS) => {
    const current = globalStore.get(key)
    return current?.value || {}
  }
  public batchUpdateStoreValues = (
    payload: { key: GLOBAL_KEYS; value: any }[]
  ) => {
    payload.forEach((item) => {
      this.updateStoreByKey(item.key, item.value)
    })
  }
  public getStoreValuesByKeys = (keys: GLOBAL_KEYS[]) => {
    return keys.map((item) => {
      const current = globalStore.get(item)
      return current?.value || {}
    })
  }
}
;(global as any).globalStore = globalStore
export { StoreViewModel }
