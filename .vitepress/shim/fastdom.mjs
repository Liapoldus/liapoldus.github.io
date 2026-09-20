const tasks = { measure: [], mutate: [] }
let scheduled = false

function flush() {
  scheduled = false
  const m = tasks.measure
  tasks.measure = []
  for (const f of m) f[0]()
  const u = tasks.mutate
  tasks.mutate = []
  for (const f of u) f[0]()
}

function schedule() {
  if (!scheduled) {
    scheduled = true
    requestAnimationFrame(flush)
  }
}

const fastdom = {
  measure(fn, ctx) {
    tasks.measure.push([() => (ctx ? fn.call(ctx) : fn())])
    schedule()
    return 0
  },
  mutate(fn, ctx) {
    tasks.mutate.push([() => (ctx ? fn.call(ctx) : fn())])
    schedule()
    return 0
  },
  clear() {
    tasks.measure = []
    tasks.mutate = []
  },
  extend(obj) {
    return Object.assign(Object.create(this), obj)
  },
  onError: undefined
}

export default fastdom