const makeCommand = () => ({
  or: (clauses) => ({ __op: "or", clauses }),
  in: (values) => ({ __op: "in", values }),
  inc: (value) => ({ __op: "inc", value }),
})

const normalizeDoc = (doc, fallbackId) => {
  const data = doc && doc.data && typeof doc.data === "object" ? doc.data : { ...doc }
  const id = doc?._id || data?._id || data?.id || fallbackId
  return { _id: id, ...data, data: { ...data } }
}

const getField = (doc, key) => {
  if (!key) return undefined
  if (key.includes(".")) {
    return key.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), doc)
  }
  if (doc && Object.prototype.hasOwnProperty.call(doc, key)) return doc[key]
  return doc?.data?.[key]
}

const matches = (doc, cond) => {
  if (!cond) return true
  if (cond.__op === "or") {
    return cond.clauses.some((clause) => matches(doc, clause))
  }
  if (typeof cond !== "object") return true
  return Object.entries(cond).every(([key, value]) => {
    if (value && value.__op === "in") {
      return value.values.includes(getField(doc, key))
    }
    return getField(doc, key) === value
  })
}

class MockQuery {
  constructor(collection, condition) {
    this.collection = collection
    this.condition = condition
    this._limit = null
    this._skip = 0
    this._orderBy = null
  }

  where(condition) {
    this.condition = condition
    return this
  }

  limit(value) {
    this._limit = value
    return this
  }

  skip(value) {
    this._skip = value
    return this
  }

  orderBy(field, direction = "asc") {
    this._orderBy = { field, direction }
    return this
  }

  _apply() {
    let rows = this.collection._store.docs.filter((doc) => matches(doc, this.condition))
    if (this._orderBy) {
      const { field, direction } = this._orderBy
      const factor = direction === "desc" ? -1 : 1
      rows = rows.slice().sort((a, b) => {
        const av = getField(a, field)
        const bv = getField(b, field)
        if (av === bv) return 0
        if (av === undefined) return 1
        if (bv === undefined) return -1
        return av > bv ? factor : -factor
      })
    }
    if (this._skip) rows = rows.slice(this._skip)
    if (typeof this._limit === "number") rows = rows.slice(0, this._limit)
    return rows
  }

  async get() {
    return { data: this._apply() }
  }

  async count() {
    return { total: this.collection._store.docs.filter((doc) => matches(doc, this.condition)).length }
  }

  async remove() {
    const docs = this.collection._store.docs
    const before = docs.length
    const remaining = docs.filter((doc) => !matches(doc, this.condition))
    docs.length = 0
    docs.push(...remaining)
    return { deleted: before - docs.length }
  }
}

class MockDoc {
  constructor(collection, id) {
    this.collection = collection
    this.id = id
  }

  async get() {
    const doc = this.collection._store.docs.find((item) => item._id === this.id)
    return { data: doc ? [doc] : [] }
  }

  async set({ data }) {
    const normalized = normalizeDoc({ _id: this.id, data }, this.id)
    const docs = this.collection._store.docs
    const index = docs.findIndex((item) => item._id === this.id)
    if (index >= 0) {
      docs[index] = normalized
    } else {
      docs.push(normalized)
    }
    return { id: this.id }
  }

  async update({ data }) {
    const docs = this.collection._store.docs
    const index = docs.findIndex((item) => item._id === this.id)
    if (index < 0) return { updated: 0 }
    const current = docs[index]
    const next = { ...current, data: { ...current.data } }
    for (const [key, value] of Object.entries(data || {})) {
      if (value && value.__op === "inc") {
        const base = next.data[key] ?? 0
        const updated = base + value.value
        next.data[key] = updated
        next[key] = updated
      } else {
        next.data[key] = value
        next[key] = value
      }
    }
    docs[index] = next
    return { updated: 1 }
  }

  async remove() {
    const docs = this.collection._store.docs
    const before = docs.length
    const remaining = docs.filter((item) => item._id !== this.id)
    docs.length = 0
    docs.push(...remaining)
    return { deleted: before - docs.length }
  }
}

class MockCollection {
  constructor(name, store) {
    this.name = name
    this._store = store
  }

  where(condition) {
    return new MockQuery(this, condition)
  }

  limit(value) {
    return new MockQuery(this, null).limit(value)
  }

  skip(value) {
    return new MockQuery(this, null).skip(value)
  }

  orderBy(field, direction) {
    return new MockQuery(this, null).orderBy(field, direction)
  }

  async get() {
    return { data: this._store.docs }
  }

  doc(id) {
    return new MockDoc(this, id)
  }

  async add({ data }) {
    const id = `${this.name}-${this._store.docs.length + 1}`
    const normalized = normalizeDoc({ _id: id, data }, id)
    this._store.docs.push(normalized)
    return { id }
  }
}

export const createMockDb = (seed = {}) => {
  const collections = new Map()
  const command = makeCommand()

  const load = (name) => {
    if (!collections.has(name)) {
      const docs = (seed[name] || []).map((doc, idx) => normalizeDoc(doc, `${name}-${idx + 1}`))
      collections.set(name, { docs })
    }
    return collections.get(name)
  }

  return {
    command,
    collection: (name) => new MockCollection(name, load(name)),
    __getCollection: (name) => load(name).docs,
  }
}
