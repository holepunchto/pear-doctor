/* global Pear */
/* eslint-env browser */

/** @typedef {import('pear-interface')} */

import z32 from 'z32'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { isLinux, isWindows, isMac } from 'which-runtime'
import pearUserDirs from 'pear-user-dirs'
import { randomBytes } from 'hypercore-crypto'
import os from 'os'

import { sections } from './sections.js'
import './start-button.js'
import './info-tooltip.js'
import './action-button.js'
const { versions, config, wakeups, Window, teardown } = Pear

const tmp = os.tmpdir()

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
              return `
            <div class="list-item " style="margin-left: 1.25rem;">
              <input
                type="checkbox"
                id="item-${index}"
                ${this.state[item.id] === true && isActive ? 'checked' : ''}
                class="check-item ${!this.state.started || !isActive ? 'inactive' : ''}
                ${this.state[item.id] === false && isActive ? 'red-cross' : ''}"
                ${!this.state.started ? 'disabled' : ''}
              />
              <label for="item-${index}" class="${this.state.started ? '' : 'disabled-label'} label ${!this.state.started || !isActive ? 'inactive' : ''}">${item.text}</label>
              <info-tooltip info-text="${isActive ? item.tooltip : item.tooltipInactive || 'This check is currently disabled.'}" applink="${applink}"></info-tooltip>
              ${item.link ? `<action-button action="Link" type="Click" href="${item.link}" class="${!this.state.started || !isActive ? 'inactive' : ''}" applink="${applink}"></action-button>` : ''}
              ${item.button ? `<${item.button} action="${item.action}" type="${item.type}" class="${!this.state.started || !isActive ? 'inactive' : ''}"></${item.button}>` : ''}
              ${item.buttonSecond ? `<${item.buttonSecond} action="${item.actionSecond}" type="${item.typeSecond}" class="secondary-button${!this.state.started || !isActive ? ' inactive' : ''}"></${item.buttonSecond}>` : ''}
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
          if (type === 'Update-Worker' && action === 'Check') this.#updateWorker()
        }

        button.addEventListener('action-button-click', listener)
        this.eventListeners.set(button, listener)
      })
    }

    #resetChecks () {
      const state = { started: false }
      this.#updateState(state, { reset: true })
      this.randomKey = randomBytes(32).toString('hex')
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
      const bin = path.join(config.pearDir, 'bin', `pear${isWindows ? '.exe' : ''}`)

      const name = 'pear-doctor-update-app'
      const tmpDir = path.join(tmp, name)
      console.log('creating dir', tmpDir)
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      await fs.promises.mkdir(tmpDir, { recursive: true })
      await fs.promises.writeFile(path.join(tmpDir, 'index.js'), `
        Pear.updates((data) => console.log(JSON.stringify({ tag: 'update', data })))
      `)
      await fs.promises.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
        name,
        main: 'index.js',
        pear: {}
      }))

      console.log('staging', bin, tmpDir)
      const stageChild = spawn(bin, ['stage', '--json', 'dev', tmpDir])
      teardown(async () => stageChild.kill())
      const stageOut = await spawnUntil({ sc: stageChild, tag: 'addendum' })
      console.log('stageOut', stageOut)

      const link = stageOut.link

      console.log('running', bin, link)
      const runChild = spawn(bin, ['run', link])
      teardown(async () => runChild.kill())
      const updatePromise = spawnUntil({ sc: runChild, tag: 'update' })

      console.log('writing test file')
      await fs.promises.writeFile(path.join(tmpDir, `${Date.now()}.tmp`), `${Date.now()}`)

      console.log('staging again', bin, tmpDir)
      const stageChild2 = spawn(bin, ['stage', '--json', 'dev', tmpDir])
      teardown(async () => stageChild2.kill())
      const stageOut2 = await spawnUntil({ sc: stageChild2, tag: 'addendum' })
      console.log('stageOut2', stageOut2)

      if (stageOut2.version <= stageOut.version) {
        this.#updateState({ LIFECYCLE_UPDATE_APP: false })
        runChild.kill()
        return
      }

      const updated = await updatePromise
      console.log('updated', updated)

      if (stageOut2.version === updated.version.length) {
        this.#updateState({ LIFECYCLE_UPDATE_APP: true })
      }
      runChild.kill()
    }

    async #updateWorker () {
      const bin = path.join(config.pearDir, 'bin', `pear${isWindows ? '.exe' : ''}`)

      const name = 'pear-doctor-update-worker'
      const tmpDir = path.join(tmp, name)
      console.log('creating dir', tmpDir)
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      await fs.promises.mkdir(tmpDir, { recursive: true })
      await fs.promises.writeFile(path.join(tmpDir, 'index.js'), `
        const pipe = Pear.worker.pipe()
        const updates = Pear.updates((data) => pipe.write(JSON.stringify({ tag: 'update', data })))
        pipe.on('end', () => updates.end())
        pipe.resume()
      `)
      await fs.promises.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({
        name,
        main: 'index.js',
        pear: {}
      }))

      console.log('staging', bin, tmpDir)
      const stageChild = spawn(bin, ['stage', '--json', 'dev', tmpDir])
      teardown(async () => stageChild.kill())
      const stageOut = await spawnUntil({ sc: stageChild, tag: 'addendum' })
      console.log('stageOut', stageOut)

      const link = stageOut.link

      console.log('running', bin, link)
      const pipe = Pear.worker.run(link)
      const updatePromise = pipeUntil({ pipe, tag: 'update' })

      console.log('writing test file')
      await fs.promises.writeFile(path.join(tmpDir, `${Date.now()}.tmp`), `${Date.now()}`)

      console.log('staging again', bin, tmpDir)
      const stageChild2 = spawn(bin, ['stage', '--json', 'dev', tmpDir])
      teardown(async () => stageChild2.kill())
      const stageOut2 = await spawnUntil({ sc: stageChild2, tag: 'addendum' })
      console.log('stageOut2', stageOut2)

      if (stageOut2.version <= stageOut.version) {
        this.#updateState({ LIFECYCLE_UPDATE_APP: false })
        pipe.end()
        return
      }

      const updated = await updatePromise
      console.log('updated', updated)

      if (stageOut2.version === updated.version.length) {
        this.#updateState({ LIFECYCLE_UPDATE_APP: true })
      }
      pipe.end()
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

async function spawnUntil ({
  sc,
  tag
}) {
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

async function pipeUntil ({
  pipe,
  tag
}) {
  const res = new Promise((resolve, reject) => {
    pipe.on('data', (data) => {
      console.log('🚀 ~ pipe.on ~ data:', data.toString())
      const json = JSON.parse(data.toString())
      if (json.tag === tag) resolve(json.data)
    })
    pipe.on('close', () => reject(new Error('unexpected closed')))
    pipe.on('end', () => reject(new Error('unexpected ended')))
  })
  pipe.write('start')
  return res
}
