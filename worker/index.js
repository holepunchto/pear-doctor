/* global Bare, Pear */
import RPC from 'tiny-buffer-rpc'
import any from 'tiny-buffer-rpc/any'
import { spawnSync } from 'bare-subprocess'
import { isWindows } from 'which-runtime'

const pipe = Pear.worker.pipe()
const rpc = new RPC((data) => {
  pipe.write(data)
})

pipe.on('data', (data) => {
  rpc.recv(data)
})

rpc.register(0, {
  request: any,
  response: any,
  onrequest: (opts) => sidecars(opts)
})

function sidecars (opts = {name: 'pear-runtime', flag: '--sidecar'}) {
  const { name, flag } = opts

  const [sh, args] = isWindows
    ? ['cmd.exe', ['/c', `wmic process where (name like '%${name}%') get name,executablepath,processid,commandline /format:csv`]]
    : ['/bin/sh', ['-c', `ps ax | grep -i -- '${name}' | grep -i -- '${flag}'`]]

  const sidecars = []
  const result = spawnSync(sh, args)

  if (result.error) return { error: result.error.message }

  const output = result.stdout.toString()
  let pidIndex = isWindows ? -1 : 0
  let isHeader = !!isWindows

  const lines = output.split(isWindows ? '\r\r\n' : '\n')
  for (const line of lines) {
    if (!line.trim()) continue
    const columns = line.split(isWindows ? ',' : ' ').filter(col => col)

    if (isHeader && isWindows) {
      const index = columns.findIndex(col => /processid/i.test(col.trim()))
      pidIndex = index !== -1 ? index : 4
      isHeader = false
    } else {
      const id = parseInt(columns[pidIndex])
      if (!isNaN(id) && id !== Bare.pid && id !== result.pid) {
        sidecars.push(id)
      }
    }
  }

  return { result: { sidecars } }
}
