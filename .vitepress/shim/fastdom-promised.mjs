import fastdomCore from './fastdom.mjs'

const make = (kind) => (fn, ctx) =>
  new Promise((resolve, reject) => {
    fastdomCore[kind](() => {
      try {
        resolve(ctx ? fn.call(ctx) : fn())
      } catch (e) {
        reject(e)
      }
    })
  })

const promisedMethods = {
  initialize() {},
  promise() {
    return this
  },
  promised() {
    return this
  },
  measure: make('measure'),
  mutate: make('mutate'),
  clear() {}
}

export default promisedMethods