/** @typedef {import('pear-interface')} */
import Runtime from 'pear-electron'
import Bridge from 'pear-bridge'

const runtime = new Runtime()

const bridge = new Bridge()
await bridge.ready()

await runtime.start({ bridge })
