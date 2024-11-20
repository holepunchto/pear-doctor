/* global Pear */
/* eslint-env browser */

/** @typedef {import('pear-interface')} */

import z32 from 'z32'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { isLinux, isWindows, isMac, arch, platform } from 'which-runtime'
import pearUserDirs from 'pear-user-dirs'
import { randomBytes } from 'hypercore-crypto'
import os from 'os'
import pearUpdaterBootstrap from 'pear-updater-bootstrap'

import { sections } from './sections.js'
import './start-button.js'
import './info-tooltip.js'
import './action-button.js'
const { versions, config, wakeups, Window, teardown } = Pear

const HOST = platform + '-' + arch
const BY_ARCH = path.join('by-arch', HOST, 'bin', `pear-runtime${isWindows ? '.exe' : ''}`)

const isLocal = config.pearDir.endsWith(path.join('pear', 'pear'))
const bin = isLocal
  ? path.join(config.pearDir, '..', `pear${isWindows ? '.cmd' : '.dev'}`)
  : path.join(config.pearDir, 'bin', `pear${isWindows ? '.cmd' : ''}`)

const tmp = os.tmpdir()
const WORKER_PARENT_CLOSE_NAME = 'pear-doctor-worker-parent-close'
const WORKER_PARENT_CLOSE_DIR = path.join(tmp, WORKER_PARENT_CLOSE_NAME)
const WORKER_PARENT_CRASH_NAME = 'pear-doctor-worker-parent-crash'
const WORKER_PARENT_CRASH_DIR = path.join(tmp, WORKER_PARENT_CRASH_NAME)

const applink = config.alias ? `pear://${config.alias}` : config.applink

const ENCRYPTED_APP_KEY = 'dgk1szcrud6cscybd3qtixcdhdr5ewizfjybtqddiytwu8gk675o'
const ENCRYPTED_APP_PASS = '123456'

customElements.define(
  'doctor-checklist',
  class extends HTMLElement {
    constructor () {
      super()
      this.root = this.attachShadow({ mode: 'open' })
      this.storage = global.localStorage
      this.state = { started: false }
      this.sections = sections
      this.items = new Map()
      this.eventListeners = new Map()
      this.entrypoint = new URLSearchParams(window.location.search).get('source')
      this.linkData = typeof config.linkData === 'string'
      this.isInviteCode = config.fragment && this.#isKeetInvite(config.fragment)
      this.platformLength = null
      this.downloads = null
      this.randomKey = randomBytes(32).toString('hex')

      const nested = localStorage.getItem('nested-entrypoint')
      if (nested) this.entrypoint = 'nested-entrypoint'
      localStorage.removeItem('nested-entrypoint')

      this.#renderLoading()

      versions().then(({ platform }) => {
        const v = ({ key, length, fork }) => `${fork}.${length}.${key}`
        const platformVersion = v(platform)
        this.storageKey = platformVersion

        for (const key in this.storage) {
          if (key !== platformVersion) {
            this.storage.removeItem(key)
          }
        }

        this.platformLength = platform.length
        this.state = this.#loadState()

        this.#render()

        Object.keys(this.state).forEach((key) => {
          if (key.startsWith('status-')) {
            this.#updateState({ [key]: undefined })
          }
        })

        this.locationFragment = location.hash.split('#').slice(1).join('')

        if (this.linkData) this.#updateState({ COLD_START_LINK: this.#isValidLinkData(config.linkData) })
        if (this.entrypoint?.length > 1 && !this.isInviteCode) this.#updateState({ COLD_START_ENTRYPOINT: this.#isValidEntrypoint(config.entrypoint) })

        if (config.fragment?.length > 0 && !this.isInviteCode) {
          this.#updateState({ COLD_START_FRAGMENT: this.#isValidFragment(config.fragment) })
          if (this.entrypoint?.length > 1) this.#updateState({ COLD_START_ENTRYPOINT_FRAGMENT: this.#isValidEntrypoint(config.entrypoint) && this.#isValidFragment(config.fragment) })
        }

        if ((config.fragment?.length > 0 || this.locationFragment) && this.isInviteCode) {
          this.#updateState({ COLD_START_INVITE_CODE: this.#isValidInviteCode(config.fragment) })
        }

        wakeups((wakeup) => {
          const url = new URL(wakeup.link)
          const isFromInside = url.searchParams.get('source') === 'inside-app'
          const isInviteCode = wakeup.fragment && this.#isKeetInvite(wakeup.fragment)

          if (typeof wakeup.linkData === 'string') this.#updateState({ WAKE_UP_LINK: this.#isValidLinkData(wakeup.linkData) })
          if (typeof wakeup.linkData === 'string' && isFromInside) this.#updateState({ WAKE_UP_LINK_FROM_INSIDE_APP: this.#isValidLinkData(wakeup.linkData) })

          if (wakeup.entrypoint?.length > 1 && !isInviteCode) this.#updateState({ WAKE_UP_ENTRYPOINT: this.#isValidEntrypoint(wakeup.entrypoint) })

          if (wakeup.fragment?.length > 0 && !isInviteCode) {
            this.#updateState({ WAKE_UP_FRAGMENT: this.#isValidFragment(wakeup.fragment, { noLocationCheck: true }) })
            if (wakeup.entrypoint?.length > 1) this.#updateState({ WAKE_UP_ENTRYPOINT_FRAGMENT: this.#isValidEntrypoint(wakeup.entrypoint) && this.#isValidFragment(wakeup.fragment, { noLocationCheck: true }) })
          }

          if (wakeup.fragment?.length > 0 && isInviteCode) {
            this.#updateState({ WAKE_UP_INVITE_CODE: this.#isValidInviteCode(wakeup.fragment, { noLocationCheck: true }) })
          }

          Window.self.focus({ steal: true }).catch(console.error)
        })
      })
    }

    #isValidLinkData (linkData) {
      if (linkData === null) return
      if (typeof linkData === 'string' && !linkData.trim().startsWith('/')) return true
      return false
    }

    #isValidEntrypoint (entrypoint) {
      if (entrypoint === null || this.source === null) return
      if (typeof entrypoint !== 'string') return false

      entrypoint = entrypoint.trim()
      if (entrypoint !== '/nested/entrypoint.html') return false
      if (entrypoint === '' || (entrypoint.startsWith('/') && entrypoint.length === 1)) return false
      if (this.#isKeetInvite(entrypoint)) return false

      return true
    }

    #isValidFragment (fragment, opts) {
      if (fragment === null) return
      console.log('this.locationFragment:', this.locationFragment)
      if (typeof fragment === 'string' && fragment.trim() !== '' && !fragment.startsWith('#') && (fragment === this.locationFragment || opts.noLocationCheck)) return true
      return false
    }

    #isValidHash () {
      return location.hash.startsWith('#')
    }

    #isValidInviteCode (str, opts) {
      if (!this.#isValidHash() && !opts.noLocationCheck) return false
      if (!this.#isValidFragment(str, opts)) return false
      return this.#isKeetInvite(str)
    }

    #isKeetInvite (str) {
      if (!str || str.length < 100) return false
      try { z32.decode(str) } catch { return false }
      return true
    }

    #loadState () {
      const state = this.storage.getItem(this.storageKey)
      return state ? JSON.parse(state) : { started: false }
    }

    #saveState () {
      this.storage.setItem(this.storageKey, JSON.stringify(this.state))
    }

    #updateState (state, opts = {}) {
      if (!state.started && !opts.reset) state.started = true
      if (opts.reset) this.state = {}
      Object.assign(this.state, state)
      this.#saveState()
      this.#onupdate()
    }

    #onupdate () {
      this.shadowRoot.querySelector('#checklist').innerHTML = this.#renderChecklist()
      this.#updateButton()
      this.#attachEventListeners()
    }

    #renderChecklist () {
      let i = 0
      return this.sections
        .map(
          (section) => `
      <div class="section ${!this.state.started ? 'inactive' : ''}">
        <div class="section-header ${!this.state.started ? 'inactive' : ''}">
          <span class="subheader ${!this.state.started ? 'inactive' : ''}">${section.title}</span>
          <info-tooltip info-text="${section.tooltip}" applink="${applink}"></info-tooltip>
        </div>
        ${section.items
          .map(
            (item, index) => {
              i++
              this.items.set(item.id, i)
              const isActive = !this.platformLength || Number(this.platformLength) > item.activeFromLength
              const isInactive = !this.state.started || !isActive || !!this.state[`status-${item.id}`]
              return `
            <div class="list-item " style="margin-left: 1.25rem;">
              <input
                type="checkbox"
                id="item-${index}"
                ${this.state[item.id] === true && isActive ? 'checked' : ''}
                class="check-item ${isInactive ? 'inactive' : ''}
                ${this.state[item.id] === false && isActive ? 'red-cross' : ''}"
                ${!this.state.started ? 'disabled' : ''}
              />
              <label for="item-${index}" class="${this.state.started ? '' : 'disabled-label'} label ${isInactive ? 'inactive' : ''}">${item.text}</label>
              <info-tooltip info-text="${isActive ? item.tooltip : item.tooltipInactive || 'This check is currently disabled.'}" applink="${applink}"></info-tooltip>
              ${item.link ? `<action-button action="Link" type="Click" href="${item.link}" class="${isInactive ? 'inactive' : ''}" applink="${applink}"></action-button>` : ''}
              ${item.button ? `<${item.button} action="${item.action}" type="${item.type}" class="${isInactive ? 'inactive' : ''}"></${item.button}>` : ''}
              ${item.buttonSecond ? `<${item.buttonSecond} action="${item.actionSecond}" type="${item.typeSecond}" class="secondary-button${isInactive ? ' inactive' : ''}"></${item.buttonSecond}>` : ''}
              ${this.state[`status-${item.id}`] ? `<span style="margin-left: 1rem">${this.state[`status-${item.id}`]}</span>` : ''}
            </div>
            <div id="result-info-${i}" class="result-info ${this.state[item.id] === true && isActive ? 'green' : 'red'}"></div>
          `
            }
          )
          .join('')}
      </div>
    `
        )
        .join('')
    }

    #updateButton () {
      const startButton = this.shadowRoot.querySelector('start-button')
      startButton.setAttribute('started', this.state.started)
    }

    #attachEventListeners () {
      const startButton = this.shadowRoot.querySelector('start-button')
      const cloned = startButton.cloneNode(true)
      startButton.parentNode.replaceChild(cloned, startButton)
      cloned.addEventListener('button-click', () => { this.state.started ? this.#resetChecks() : this.#startChecks() })

      this.shadowRoot.querySelectorAll('action-button').forEach(button => {
        if (this.eventListeners.has(button)) button.removeEventListener('action-button-click', this.eventListeners.get(button))

        const listener = (event) => {
          const { type, action } = event.detail
          if (type === 'Nurse') this.#openNurse()
          if (type === 'Microphone' && action === 'Status') this.#getMicrophoneStatus()
          if (type === 'Camera' && action === 'Status') this.#getCameraStatus()
          if (type === 'Screen' && action === 'Status') this.#getScreenStatus()
          if (type === 'Microphone' && action === 'Access') this.#getMicrophoneAccess()
          if (type === 'Camera' && action === 'Access') this.#getCameraAccess()
          if (type === 'Screen' && action === 'Access') this.#getScreenAccess()
          if (type === 'Zombie-Sidecar' && action === 'Check') this.#sidecars()
          if (type === 'Trust-Dialog' && action === 'Check') this.#checkTrustDialog()
          if (type === 'Password-Dialog' && action === 'Check') this.#checkPasswordDialog()
          if (type === 'Teardown-Normal' && action === 'Check') this.#teardownNormal()
          if (type === 'Teardown-Force' && action === 'Check') this.#teardownForce()
          if (type === 'Restart-Platform' && action === 'Restart') this.#restartPlatform()
          if (type === 'Restart-Platform' && action === 'Check') this.#restartPlatformCheck()
          if (type === 'Restart-Client' && action === 'Restart') this.#restartClient()
          if (type === 'Restart-Client' && action === 'Check') this.#restartClientCheck()
          if (type === 'Update-App' && action === 'Check') this.#updateApp()
          if (type === 'Update-App-Desktop' && action === 'Test') this.#updateAppDesktopTest()
          if (type === 'Update-App-Desktop' && action === 'Check') this.#updateAppDesktopCheck()
          if (type === 'Update-Platform' && action === 'Check') this.#updatePlatform()
          if (type === 'Update-Platform-Desktop' && action === 'Check') this.#updatePlatformDesktopTest()
          if (type === 'Worker-Parent-Close' && action === 'Close') this.#workerParentClose()
          if (type === 'Worker-Parent-Close' && action === 'Check') this.#workerParentCloseCheck()
          if (type === 'Worker-Parent-Crash' && action === 'Crash') this.#workerParentCrash()
          if (type === 'Worker-Parent-Crash' && action === 'Check') this.#workerParentCrashCheck()
        }

        button.addEventListener('action-button-click', listener)
        this.eventListeners.set(button, listener)
      })
    }

    async #resetChecks () {
      const state = { started: false }
      this.#updateState(state, { reset: true })
      this.randomKey = randomBytes(32).toString('hex')

      await fs.promises.rm(WORKER_PARENT_CLOSE_DIR, { recursive: true, force: true })
      await fs.promises.rm(WORKER_PARENT_CRASH_DIR, { recursive: true, force: true })
    }

    #startChecks () {
      this.#updateState({ started: true })
    }

    #openNurse () {
      const nurse = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Pear Nurse</title>
          <link href="https://fonts.googleapis.com/css2?family=Overpass+Mono&display=swap" rel="stylesheet">
        </head>
        <body>
          <style>
            body {
              font-family: sans-serif;
              font-size: 0.75rem;
              background: #151517;
              color: #FFF;
              font-family: 'Overpass Mono', monospace;
            }
            a, a:visited, a:hover, a:active {
              color: #B0D944;
            }
            li {
              margin-bottom: 1em;
            }
            .green {
              color: #B0D944;
            }
          </style>
          <div>
            <h1 class="green">Pear Nurse</h1>
            <ul id="link-list">
              <li>
                <strong>Link:</strong>
                <a id="link1" href="${applink}">${applink}</a>
              </li>
              <li>
                <strong>Fragment:</strong>
                <a id="link2" href="${applink}/#fragment">${applink}/#fragment</a>
              </li>
              <li>
                <strong>Entrypoint:</strong>
                <a id="link3" href="${applink}/nested/entrypoint.html">${applink}/nested/entrypoint.html</a>
              </li>
              <li>
                <strong>Entrypoint fragment:</strong>
                <a id="link4" href="${applink}/nested/entrypoint.html#fragment">${applink}/nested/entrypoint.html#fragment</a>
              </li>
              <li>
                <strong>Legacy invite code:</strong>
                <a id="link5" href="${applink}/xeb7mugj8sbaytkf5qqu9z1snegtibqneysssdqu35em4zw3ou9wcmz8ha4er6e759tams9eeebo6j6ueifyb4oaeohnijbyxfzessxjneaqs8ux">${applink}/xeb7mugj8sbaytkf5qqu9z1snegtibqneysssdqu35em4zw3ou9wcmz8ha4er6e759tams9eeebo6j6ueifyb4oaeohnijbyxfzessxjneaqs8ux</a>
              </li>
              <li>
                <strong>Random key:</strong>
                <a id="link5" href="pear://${this.randomKey}">pear://${this.randomKey}</a>
                <br />
                <br />
                <ul>
                  <li>Just ignore and close the non-existing app opened because this is a random key</li>
                  <li>Click Reset in Doctor app to generate a new random key</li>
                </ul>
              </li>
              <li>
                <strong>Encrypted key:</strong>
                <a id="link5" href="pear://${ENCRYPTED_APP_KEY}">pear://${ENCRYPTED_APP_KEY}</a>
                <br />
                <br />
                <ul>
                  <li>Close the doctor app, and reopen with option '--unsafe-clear-preferences' to clear passwords of encrypted apps (this also clear the trusted apps)</li>
                  <li>Command: pear run --unsafe-clear-preferences ${applink}</li>
                  <li>Click on the Encrypted key, the Password dialog should appear (password is ${ENCRYPTED_APP_PASS})</li>
                </ul>
              </li>
            </ul>
          </div>
        </body>
        </html>
        `

      if (!this.downloads) this.downloads = pearUserDirs({ sync: true }).downloads
      const destPath = path.join(this.downloads, 'nurse.html')

      try {
        fs.writeFile(destPath, nurse, (err) => {
          if (err) return console.error(err)
          const command = isWindows ? 'start' : isMac ? 'open' : isLinux ? 'xdg-open' : null
          if (!command) return
          const args = [destPath]
          spawn(command, args, { shell: true })
        })
      } catch { /* ignore */ }
    }

    #getMicrophoneStatus () {
      Pear.media.status.microphone().then((res) => {
        this.#updateState({ MEDIA_MICROPHONE_STATUS: !!res })
      })
    }

    #getCameraStatus () {
      Pear.media.status.camera().then((res) => {
        this.#updateState({ MEDIA_CAMERA_STATUS: !!res })
      })
    }

    #getScreenStatus () {
      Pear.media.status.screen().then((res) => {
        this.#updateState({ MEDIA_SCREEN_STATUS: !!res })
      })
    }

    #getMicrophoneAccess () {
      Pear.media.access.microphone().then((res) => {
        this.#updateState({ MEDIA_MICROPHONE_ACCESS: !!res || res === false })
      })
    }

    #getCameraAccess () {
      Pear.media.access.camera().then((res) => {
        this.#updateState({ MEDIA_CAMERA_ACCESS: !!res || res === false })
      })
    }

    #getScreenAccess () {
      Pear.media.access.screen().then((res) => {
        this.#updateState({ MEDIA_SCREEN_ACCESS: !!res || res === false })
      })
    }

    async #sidecars () {
      const id = this.items.get('LIFECYCLE_ZOMBIE_SIDECARS')

      const { result, error } = await this.sidecars({ name: 'pear-runtime', flag: '--sidecar' })
      if (error) return console.error(error)

      const { sidecars } = result
      this.#updateState({ LIFECYCLE_ZOMBIE_SIDECARS: sidecars.length <= 1 })

      const text = `Pear sidecar processes: ${sidecars.length} (pid ${sidecars.join(', ')})`
      const element = this.shadowRoot.getElementById(`result-info-${id}`)
      if (element) element.textContent = text
    }

    async sidecars (opts = { name: 'pear-runtime', flag: '--sidecar' }) {
      const { name, flag } = opts
      const sidecars = []
      const pearDir = Pear.config.pearDir

      const [sh, args] = isWindows
        ? ['cmd.exe', ['/c', `wmic process where (name like '%${name}%') get name,executablepath,processid,commandline /format:csv`]]
        : ['/bin/sh', ['-c', `pgrep -fl '${name}' | grep -i -- '${flag}'`]]

      const sp = spawn(sh, args)
      let output = ''

      sp.stdout.on('data', (data) => {
        output += data.toString()
        const lines = output.split(isWindows ? '\r\r\n' : '\n')
        output = lines.pop()

        for (const line of lines) {
          if (!line.trim()) continue

          if (isWindows) {
            const columns = line.split(',').filter(col => col)
            const id = parseInt(columns[2])
            const cmdName = columns[3] || ''
            if (!isNaN(id) && ![global.process.pid, sp.pid].includes(id)) {
              if (cmdName.includes(pearDir)) {
                sidecars.push(id)
              }
            }
          } else {
            const columns = line.trim().split(/\s+/)
            const id = parseInt(columns[0])
            const cmdName = columns.slice(1).join(' ')
            if (!isNaN(id) && ![global.process.pid, sp.pid].includes(id)) {
              if (cmdName.includes(pearDir)) {
                sidecars.push(id)
              }
            }
          }
        }
      })

      return await new Promise((resolve) => {
        sp.on('exit', (code, signal) => {
          resolve({
            result: { sidecars },
            error: (code !== 0 || signal) ? `Process exited with code: ${code}, signal: ${signal}` : null
          })
        })
      })
    }

    #checkTrustDialog () {
      this.#updateState({ LIFECYCLE_TRUST_DIALOG: true })
    }

    #checkPasswordDialog () {
      this.#updateState({ LIFECYCLE_PASSWORD_DIALOG: true })
    }

    #teardownNormal () {
      teardown(() => new Promise((resolve) => {
        console.log('Start teardown normal')
        setTimeout(() => {
          console.log('Done Teardown normal')
          this.#updateState({ LIFECYCLE_TEARDOWN_NORMAL: true })
          resolve()
        }, 1000) // MAX_TEARDOWN_WAIT is 15000
      }))
      Pear.Window.self.close()
    }

    #teardownForce () {
      teardown(() => Promise.all([
        new Promise((resolve) => {
          console.log('Start teardown force')
          setTimeout(() => {
            console.log('Done teardown force')
            this.#updateState({ LIFECYCLE_TEARDOWN_FORCE: true })
            resolve()
          }, 14000) // MAX_TEARDOWN_WAIT is 15000
        }),
        new Promise((resolve) => {
          console.log('Start teardown force - never resolved')
          setTimeout(() => {
            console.log('Done teardown force - never happened')
            this.#updateState({ LIFECYCLE_TEARDOWN_FORCE: false })
            resolve()
          }, 16000) // MAX_TEARDOWN_WAIT is 15000
        })
      ]))
      Pear.Window.self.close()
    }

    async #restartPlatform () {
      await Pear.restart({ platform: true })
    }

    async #restartPlatformCheck () {
      this.#updateState({ LIFECYCLE_RESTART_PLATFORM: true })
    }

    async #restartClient () {
      await Pear.restart({ platform: false })
    }

    async #restartClientCheck () {
      this.#updateState({ LIFECYCLE_RESTART_CLIENT: true })
    }

    async #updateApp () {
      const name = 'pear-doctor-update-app'
      const tmpDir = path.join(tmp, name)
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      await fs.promises.mkdir(tmpDir, { recursive: true })
      await fs.promises.writeFile(path.join(tmpDir, 'index.js'), `
        const pipe = Pear.worker.pipe()
        pipe.resume()
        const updates = Pear.updates((data) => {
          pipe.write(JSON.stringify({ tag: 'update', data }))
        })
        Pear.versions().then((data) => {
          pipe.write(JSON.stringify({ tag: 'versions', data }))
        })
      `)
      await fs.promises.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
        name,
        main: 'index.js',
        pear: {}
      }))

      const pipe = Pear.worker.run(tmpDir)
      teardown(async () => pipe.end())
      // TODO: worker has to send a message, otherwise pipe.write in Pear.updates will never run, why?
      await pipeUntil({ pipe, tag: 'versions' })

      const updatePromise = pipeUntil({ pipe, tag: 'update' })
      await fs.promises.writeFile(path.join(tmpDir, `${Date.now()}.tmp`), `${Date.now()}`)

      const updateRes = await updatePromise
      const isUpdated = updateRes.type === 'pear/updates' && updateRes.app === true
      this.#updateState({ LIFECYCLE_UPDATE_APP: isUpdated })

      pipe.end()
      await pipeUntilClose({ pipe })
    }

    async #updateAppDesktopTest () {
      const name = 'pear-doctor-update-app-desktop'
      const tmpDir = path.join(tmp, name)
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      await fs.promises.mkdir(tmpDir, { recursive: true })
      await fs.promises.writeFile(path.join(tmpDir, 'app.js'), `
        import fs from 'fs' 
        import path from 'path'
        const updates = Pear.updates((data) => {
          document.getElementById('update-status').innerText = 'Updated'
          document.getElementById('update-result').innerText = JSON.stringify(data, null, 2)
        })
        fs.promises.writeFile(path.join('${isWindows ? tmpDir.replaceAll("\\", "\\\\") : tmpDir}', '${Date.now()}.tmp'), '${Date.now()}')
      `)
      await fs.promises.writeFile(path.join(tmpDir, 'index.html'), `
        <html>
          <head>
            <style>
              body {
                background-color: #6c9368;
                color: #f2f2f2;
              }
            </style>
          </head>
          <body>
            <pear-ctrl></pear-ctrl>
            <br />
            <h1 id="update-status">Waiting for update...</h1>
            <pre id="update-result"></pre>
          </body>
          <script src="./app.js" type="module"></script>
        </html>
      `)
      await fs.promises.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
        name,
        main: 'index.html',
        type: 'module',
        pear: {}
      }))

      spawn(bin, ['run', tmpDir], { shell: !!isWindows })
    }

    #updateAppDesktopCheck () {
      this.#updateState({ LIFECYCLE_UPDATE_APP_DESKTOP: true })
    }

    async #updatePlatform () {
      this.#updateState({ LIFECYCLE_UPDATE_PLATFORM: undefined })

      const dumpDir = path.join(tmp, 'pear-doctor-update-platform-dump')
      const platformDir1 = path.join(tmp, 'pear-doctor-update-platform-dir')
      const platformDir2 = path.join(tmp, 'pear-doctor-update-platform-dir-2')
      const statusId = 'status-LIFECYCLE_UPDATE_PLATFORM'

      //
      // helpers
      //
      const bootstrapPlatforms = async () => {
        const version = await versions()

        this.#updateState({ [statusId]: 'dumping-platform...' })
        await fs.promises.rm(dumpDir, { recursive: true, force: true })
        await fs.promises.mkdir(dumpDir, { recursive: true })
        const dumpChild = spawn(bin, ['dump', '--json', `pear://${version.platform.key}`, dumpDir], { shell: !!isWindows })
        teardown(async () => dumpChild.kill())
        const dumpOut = await spawnUntil({ sc: dumpChild, tag: 'final' })
        if (dumpOut.success !== true) {
          console.error('Failed to dump')
          this.#updateState({ LIFECYCLE_UPDATE_PLATFORM: false })
          return
        }

        this.#updateState({ [statusId]: 'staging-platform...' })
        const stageChild = spawn(bin, ['stage', '--json', 'dev', dumpDir], { shell: !!isWindows })
        teardown(async () => stageChild.kill())
        const stageOut = await spawnUntil({ sc: stageChild, tag: 'addendum' })
        const dumpKey = stageOut.key

        this.#updateState({ [statusId]: 'seeding-platform...' })
        const seedChild = spawn(bin, ['seed', '--json', 'dev', dumpDir], { shell: !!isWindows })
        teardown(async () => seedChild.kill())
        await spawnUntil({ sc: seedChild, tag: 'announced' })

        this.#updateState({ [statusId]: 'bootstrapping-1...' })
        await fs.promises.rm(platformDir1, { recursive: true, force: true })
        await fs.promises.mkdir(platformDir1, { recursive: true })
        await pearUpdaterBootstrap(dumpKey, platformDir1, { bootstrap: config.dht.bootstrap })

        this.#updateState({ [statusId]: 'bootstrapping-2...' })
        await fs.promises.rm(platformDir2, { recursive: true, force: true })
        await fs.promises.mkdir(platformDir2, { recursive: true })
        await pearUpdaterBootstrap(dumpKey, platformDir2, { bootstrap: config.dht.bootstrap })
      }

      const platformDir1SeedApp = async () => {
        this.#updateState({ [statusId]: 'creating-app...' })
        const name = 'pear-doctor-update-platform-app'
        const appDir = path.join(tmp, name)
        await fs.promises.rm(appDir, { recursive: true, force: true })
        await fs.promises.mkdir(appDir, { recursive: true })
        await fs.promises.writeFile(path.join(appDir, 'index.js'), `
          const pipe = Pear.worker.pipe()
          pipe.resume()
          const updates = Pear.updates((data) => {
            pipe.write(JSON.stringify({ tag: 'update', data }))
          })
          Pear.versions().then((data) => { 
            pipe.write(JSON.stringify({ tag: 'versions', data }))
          })
        `)
        await fs.promises.writeFile(path.join(appDir, 'package.json'), JSON.stringify({
          name,
          main: 'index.js',
          pear: {}
        }))

        const platformRuntime = path.join(platformDir1, 'current', BY_ARCH)

        this.#updateState({ [statusId]: 'staging-app...' })
        const stageChild = spawn(platformRuntime, ['stage', '--json', 'dev', appDir], { shell: !!isWindows })
        teardown(async () => stageChild.kill())
        const stageOut = await spawnUntil({ sc: stageChild, tag: 'addendum' })

        this.#updateState({ [statusId]: 'seeding-app...' })
        const seedChild = spawn(platformRuntime, ['seed', '--json', 'dev', appDir], { shell: !!isWindows })
        teardown(async () => seedChild.kill())
        await spawnUntil({ sc: seedChild, tag: 'announced' })

        return { appLink: stageOut.link }
      }

      const platformDir2RunApp = async (appLink) => {
        this.#updateState({ [statusId]: 'creating-run-app...' })
        const platformRuntime = path.join(platformDir2, 'current', BY_ARCH)
        const name = 'pear-doctor-update-platform-run-app'
        const appDir = path.join(tmp, name)
        await fs.promises.rm(appDir, { recursive: true, force: true })
        await fs.promises.mkdir(appDir, { recursive: true })
        await fs.promises.writeFile(path.join(appDir, 'index.js'), `
          const pipeIn = Pear.worker.pipe()
          pipeIn.resume()
          Pear.worker.constructor.RUNTIME = '${isWindows ? platformRuntime.replaceAll("\\", "\\\\") : platformRuntime}'
          const pipeOut = Pear.worker.run('${appLink}')
          Pear.teardown(async () => pipeOut.end())
          pipeOut.on('data', (data) => pipeIn.write(data.toString()))
        `)
        await fs.promises.writeFile(path.join(appDir, 'package.json'), JSON.stringify({
          name,
          main: 'index.js',
          pear: {}
        }))

        this.#updateState({ [statusId]: 'running-app...' })
        // we cannot run `appLink` directly because doctor is a desktop app that
        //   cannot update `Pear.worker.constructor.RUNTIME` of the electron process
        // we run a terminal app `appDir` to run the `appLink` instead
        const pipe = Pear.worker.run(appDir)
        teardown(async () => pipe.end())
        await pipeUntil({ pipe, tag: 'versions' })

        const updatePromise = pipeUntil({ pipe, tag: 'update' })

        return { pipe, updatePromise }
      }

      const stageNewFile = async () => {
        await fs.promises.writeFile(path.join(dumpDir, `${Date.now()}.tmp`), `${Date.now()}`)
        this.#updateState({ [statusId]: 'staging-platform...' })
        const stageChild = spawn(bin, ['stage', '--json', 'dev', dumpDir], { shell: !!isWindows })
        teardown(async () => stageChild.kill())
        await spawnUntil({ sc: stageChild, tag: 'addendum' })
      }

      //
      // main
      //
      this.#updateState({ [statusId]: 'starting...' })
      await bootstrapPlatforms()
      const { appLink } = await platformDir1SeedApp()
      const { pipe, updatePromise } = await platformDir2RunApp(appLink)
      await stageNewFile()

      this.#updateState({ [statusId]: 'waiting for update...' })
      const updateRes = await updatePromise
      const isUpdated = updateRes.type === 'pear/updates' && updateRes.app === false

      this.#updateState({ LIFECYCLE_UPDATE_PLATFORM: isUpdated, [statusId]: undefined })

      pipe.end()
      await pipeUntilClose({ pipe })
    }

    async #updatePlatformDesktopTest () {
      this.#updateState({ LIFECYCLE_UPDATE_PLATFORM_DESKTOP: undefined })

      const dumpDir = path.join(tmp, 'pear-doctor-update-platform-dump')
      const platformDir1 = path.join(tmp, 'pear-doctor-update-platform-dir')
      const platformDir2 = path.join(tmp, 'pear-doctor-update-platform-dir-2')
      const statusId = 'status-LIFECYCLE_UPDATE_PLATFORM_DESKTOP'

      //
      // helpers
      //
      const bootstrapPlatforms = async () => {
        const version = await versions()

        this.#updateState({ [statusId]: 'dumping-platform...' })
        await fs.promises.rm(dumpDir, { recursive: true, force: true })
        await fs.promises.mkdir(dumpDir, { recursive: true })
        const dumpChild = spawn(bin, ['dump', '--json', `pear://${version.platform.key}`, dumpDir], { shell: !!isWindows })
        teardown(async () => dumpChild.kill())
        const dumpOut = await spawnUntil({ sc: dumpChild, tag: 'final' })
        if (dumpOut.success !== true) {
          console.error('Failed to dump')
          this.#updateState({ LIFECYCLE_UPDATE_PLATFORM: false })
          return
        }

        this.#updateState({ [statusId]: 'staging-platform...' })
        const stageChild = spawn(bin, ['stage', '--json', 'dev', dumpDir], { shell: !!isWindows })
        teardown(async () => stageChild.kill())
        const stageOut = await spawnUntil({ sc: stageChild, tag: 'addendum' })
        const dumpKey = stageOut.key

        this.#updateState({ [statusId]: 'seeding-platform...' })
        const seedChild = spawn(bin, ['seed', '--json', 'dev', dumpDir], { shell: !!isWindows })
        teardown(async () => seedChild.kill())
        await spawnUntil({ sc: seedChild, tag: 'announced' })

        this.#updateState({ [statusId]: 'bootstrapping-1...' })
        await fs.promises.rm(platformDir1, { recursive: true, force: true })
        await fs.promises.mkdir(platformDir1, { recursive: true })
        await pearUpdaterBootstrap(dumpKey, platformDir1, { bootstrap: config.dht.bootstrap })

        this.#updateState({ [statusId]: 'bootstrapping-2...' })
        await fs.promises.rm(platformDir2, { recursive: true, force: true })
        await fs.promises.mkdir(platformDir2, { recursive: true })
        await pearUpdaterBootstrap(dumpKey, platformDir2, { bootstrap: config.dht.bootstrap })
      }

      const platformDir1SeedApp = async () => {
        this.#updateState({ [statusId]: 'creating-app...' })
        const name = 'pear-doctor-update-platform-app-desktop'
        const appDir = path.join(tmp, name)
        await fs.promises.rm(appDir, { recursive: true, force: true })
        await fs.promises.mkdir(appDir, { recursive: true })
        await fs.promises.writeFile(path.join(appDir, 'app.js'), `
          const updates = Pear.updates((data) => {
            document.getElementById('update-status').innerText = 'Updated'
            document.getElementById('update-result').innerText = JSON.stringify(data, null, 2)
          })
        `)
        await fs.promises.writeFile(path.join(appDir, 'index.html'), `
          <html>
            <head>
              <style>
                body {
                  background-color: #6c9368;
                  color: #f2f2f2;
                }
              </style>
            </head>
            <body>
              <pear-ctrl></pear-ctrl>
              <br />
              <h1 id="update-status">Waiting for update...</h1>
              <pre id="update-result"></pre>
            </body>
            <script src="./app.js" type="module"></script>
          </html>
        `)
        await fs.promises.writeFile(path.join(appDir, 'package.json'), JSON.stringify({
          name,
          main: 'index.html',
          type: 'module',
          pear: {}
        }))

        const platformRuntime = path.join(platformDir1, 'current', BY_ARCH)

        this.#updateState({ [statusId]: 'staging-app...' })
        const stageChild = spawn(platformRuntime, ['stage', '--json', 'dev', appDir], { shell: !!isWindows })
        teardown(async () => stageChild.kill())
        const stageOut = await spawnUntil({ sc: stageChild, tag: 'addendum' })

        this.#updateState({ [statusId]: 'seeding-app...' })
        const seedChild = spawn(platformRuntime, ['seed', '--json', 'dev', appDir], { shell: !!isWindows })
        teardown(async () => seedChild.kill())
        await spawnUntil({ sc: seedChild, tag: 'announced' })

        return { appLink: stageOut.link }
      }

      const platformDir2RunApp = async (appLink) => {
        this.#updateState({ [statusId]: 'running-app...' })
        const platformRuntime = path.join(platformDir2, 'current', BY_ARCH)
        spawn(platformRuntime, ['run', '--trusted', appLink], { shell: !!isWindows })
      }

      const stageNewFile = async () => {
        await fs.promises.writeFile(path.join(dumpDir, `${Date.now()}.tmp`), `${Date.now()}`)
        this.#updateState({ [statusId]: 'staging-platform...' })
        const stageChild = spawn(bin, ['stage', '--json', 'dev', dumpDir], { shell: !!isWindows })
        teardown(async () => stageChild.kill())
        await spawnUntil({ sc: stageChild, tag: 'addendum' })
      }

      //
      // main
      //
      this.#updateState({ [statusId]: 'starting...' })
      await bootstrapPlatforms()
      const { appLink } = await platformDir1SeedApp()
      await platformDir2RunApp(appLink)

      await new Promise((resolve) => setTimeout(resolve, 5000))
      await stageNewFile()
    }

    async #workerParentClose () {
      const dir = WORKER_PARENT_CLOSE_DIR
      await fs.promises.rm(dir, { recursive: true, force: true })
      await fs.promises.mkdir(dir, { recursive: true })
      await fs.promises.writeFile(path.join(dir, 'index.js'), `
        const fs = require('bare-fs')
        const path = require('bare-path')
        
        const outputPath = path.join(${JSON.stringify(dir)}, "output.tmp")
        Pear.teardown(() => fs.appendFileSync(outputPath, 'exited\\n', 'utf8'))

        const pipe = Pear.worker.pipe()
        pipe.on('data', () => fs.appendFileSync(outputPath, 'started\\n', 'utf8'))
        pipe.on('end', () => fs.appendFileSync(outputPath, 'ended\\n', 'utf8'))

        pipe.write(JSON.stringify({ tag: 'ready' }))
      `)
      await fs.promises.writeFile(path.join(dir, 'package.json'), JSON.stringify({
        name: WORKER_PARENT_CLOSE_NAME,
        main: 'index.js',
        pear: { type: 'terminal' },
        dependencies: { 'bare-fs': 'latest', 'bare-path': 'latest' }
      }))

      const npmi = spawn('npm', ['install'], { cwd: dir, stdio: 'ignore' })
      await new Promise((resolve, reject) => npmi.on('exit', (code) => code === 0 ? resolve(code) : reject(code)))

      const pipe = Pear.worker.run(dir)
      await pipeUntil(({ pipe, tag: 'ready' }))

      setTimeout(() => Pear.Window.self.close(), 2000)
    }

    async #workerParentCloseCheck () {
      const outputPath = path.join(WORKER_PARENT_CLOSE_DIR, 'output.tmp')
      const contents = await fs.promises.readFile(outputPath, 'utf8')
      const lines = contents.split('\n')
      const lastLine = lines[lines.length - 2]

      if (lastLine === 'exited') this.#updateState({ WORKER_PARENT_CLOSE: true })
    }

    async #workerParentCrash () {
      const dir = WORKER_PARENT_CRASH_DIR
      await fs.promises.rm(dir, { recursive: true, force: true })
      await fs.promises.mkdir(dir, { recursive: true })
      await fs.promises.writeFile(path.join(dir, 'index.js'), `
        const fs = require('bare-fs')
        const path = require('bare-path')
        
        const outputPath = path.join(${JSON.stringify(dir)}, "output.tmp")
        Pear.teardown(() => fs.appendFileSync(outputPath, 'exited\\n', 'utf8'))

        const pipe = Pear.worker.pipe()
        pipe.on('data', () => fs.appendFileSync(outputPath, 'started\\n', 'utf8'))
        pipe.on('end', () => fs.appendFileSync(outputPath, 'ended\\n', 'utf8'))

        pipe.write(JSON.stringify({ tag: 'ready' }))
      `)
      await fs.promises.writeFile(path.join(dir, 'package.json'), JSON.stringify({
        name: WORKER_PARENT_CRASH_NAME,
        main: 'index.js',
        pear: { type: 'terminal' },
        dependencies: { 'bare-fs': 'latest', 'bare-path': 'latest' }
      }))

      const npmi = spawn('npm', ['install'], { cwd: dir, stdio: 'ignore' })
      await new Promise((resolve, reject) => npmi.on('exit', (code) => code === 0 ? resolve(code) : reject(code)))

      const pipe = Pear.worker.run(dir)
      await pipeUntil({ pipe, tag: 'ready' })

      setTimeout(() => process.crash(), 2000)
    }

    async #workerParentCrashCheck () {
      const outputPath = path.join(WORKER_PARENT_CRASH_DIR, 'output.tmp')
      const contents = await fs.promises.readFile(outputPath, 'utf8')
      const lines = contents.split('\n')
      const lastLine = lines[lines.length - 2]

      if (lastLine === 'exited') this.#updateState({ WORKER_PARENT_CRASH: true })
    }

    #renderLoading () {
      this.shadowRoot.innerHTML = `
        <div id="panel">
          <div>Loading...</div>
        </div>
      `
    }

    #render () {
      this.shadowRoot.innerHTML = `
        <div id="panel">
          <style>
            #panel {
              user-select: none;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin: 0;
              padding: 0;
            }

            h1 {
              font-size: 2.5rem;
            }

            .header-container {
              display: flex;
              align-items: center;
              position: sticky;
              top: 2rem;
              background: #151517;
              white-space: nowrap;
              z-index:2;
            }

            .list-container h1.green {
              margin-right: 2rem;
              margin-bottom: 0.5rem;
              margin-top: 0.5rem;
            }

            .list-container {
              padding-left: 2rem;
            }

            .list-item {
              margin-bottom: 0.625rem;
              position: relative;
              display: flex;
              align-items: center;
              white-space: nowrap;
            }

            .label {
              pointer-events: none;
              margin-left: 1rem;
              margin-right: 0.5rem;
            }

            .check-item {
              pointer-events: none;
            }

            .check-item:disabled {
              opacity: 0.5;
            }

            .disabled-label {
              opacity: 0.5;
              pointer-events: none;
            }

            .result-info {
              margin-left: 3.5rem;
              max-width: 30rem;
            }

            .inactive {
              opacity: 0.5;
              pointer-events: none;
            }

            .secondary-button {
              margin-left: 1rem;
            }

            .section-header {
              font-weight: bold;
              margin-top: 2rem;
              margin-bottom: 0.5rem;
              display: flex;
              align-items: center;
            }

            .version {
              font-size: 0.8rem;
              color: #b0d944;
              margin-top: 0.5rem;
            }

            .green {
              color: #b0d944;
            }

            .red {
              color: #ff4c4c;
            }

            .logo {
              margin-bottom: 0.5rem;
            }

            .subheader {
              margin-right: 0.5rem;
            }

            input[type="checkbox"] {
              appearance: none;
              -webkit-appearance: none;
              -moz-appearance: none;
              display: inline-block;
              width: 1rem;
              height: 1rem;
              background-color: #151517;
              border: 0.0625rem solid #B0D944;
              border-radius: 0.25rem;
              position: relative;
              cursor: pointer;
              vertical-align: middle;
            }

            input[type="checkbox"]:checked {
              border-color: #151517;
            }

            input[type="checkbox"]:checked::after {
              content: '';
              display: block;
              width: 0.4rem;
              height: 1rem;
              border: 0.1rem solid #B0D944;
              border-width: 0 0.25rem 0.25rem 0;
              transform: rotate(45deg);
              position: absolute;
              bottom: 0.1875rem;
              left: 0.375rem;
            }

            input[type="checkbox"].red-cross {
              border: none;
            }

            input[type="checkbox"].red-cross::after {
              content: '✖';
              color: #FF4C4C;
              font-size: 1.5rem;
              position: absolute;
              top:-0.25rem;
              left: 0.125rem;
            }

            .link {
              margin-left: 1rem;
              color: #b0d944;
              text-decoration: underline;
             }

            .link:hover {
              color: #8bbf32;
             }

            .ml {
              margin-left: 1rem;
            }
          </style>
          <div class="list-container">
            <div class="header-container">
              <h1 class="green">Pear Doctor</h1>
              <action-button icon="✚" action="" type="Nurse" applink="${applink}" ></action-button>
              <start-button started="${this.state.started}" class="ml"></start-button>
            </div>
            <div id="checklist">
              ${this.#renderChecklist()}
            </div>
          </div>
        </div>
      `
      this.#attachEventListeners()
    }
  }
)

async function pipeUntil ({ pipe, tag }) {
  const res = new Promise((resolve, reject) => {
    pipe.on('data', (data) => {
      const json = JSON.parse(Buffer.from(data).toString())
      if (json.tag === tag) resolve(json.data)
    })
    pipe.on('close', () => reject(new Error('unexpected closed')))
    pipe.on('end', () => reject(new Error('unexpected ended')))
  })
  pipe.write('start')
  return res
}

async function pipeUntilClose ({ pipe }) {
  const res = new Promise((resolve) => {
    pipe.on('close', () => resolve('closed'))
    pipe.on('end', () => resolve('ended'))
  })
  return res
}

async function spawnUntil ({ sc, tag }) {
  return new Promise((resolve, reject) => {
    sc.stdout.on('data', (data) => {
      try {
        const lines = data.toString().split('\n')
          .map((line) => line.trim())
          .map((line) => line.replace(/^,/, ''))
          .filter(line => line)
          .map((line) => JSON.parse(line))
        const found = lines.find((line) => line.tag === tag)
        if (found) resolve(found.data)
      } catch (e) {
        console.error(e, data.toString())
        reject(e)
      }
    })
  })
}
