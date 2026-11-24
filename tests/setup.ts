/** A tiny in-memory stand-in for the browser's sessionStorage, so storage code can run under Node. */
class MemoryStorage {
  private data = new Map<string, string>()
  get length() {
    return this.data.size
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.data.has(k) ? (this.data.get(k) as string) : null
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v))
  }
  removeItem(k: string) {
    this.data.delete(k)
  }
  clear() {
    this.data.clear()
  }
}

Object.defineProperty(globalThis, 'sessionStorage', { value: new MemoryStorage(), configurable: true })
