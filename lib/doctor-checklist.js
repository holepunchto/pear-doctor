/* global Pear */
/* eslint-env browser */

/** @typedef {import('pear-interface')} */

import z32 from 'z32'
import fs from 'fs'
import path from 'path'
import http from 'http'
import ui from 'pear-electron'
import run from 'pear-run'
import { spawn } from 'child_process'
import { isLinux, isWindows, isMac, arch, platform } from 'which-runtime'
import pearUserDirs from 'pear-user-dirs'
import { discoveryKey, randomBytes } from 'hypercore-crypto'
import os from 'os'
import HyperDB from 'hyperdb'
import dbSpec from '../spec/db/index.js'

import { sections } from './sections.js'
import './start-button.js'
import './info-tooltip.js'
import './action-button.js'
const { versions, config, wakeups, teardown } = Pear

const HOST = platform + '-' + arch
const BY_ARCH = path.join(
  'by-arch',
  HOST,
  'bin',
  `pear-runtime${isWindows ? '.exe' : ''}`
)

const isPearDev = config.pearDir.endsWith(path.join('pear', 'pear'))
const bin = isPearDev
  ? path.join(config.pearDir, '..', `pear${isWindows ? '.cmd' : '.dev'}`)
  : path.join(config.pearDir, 'bin', `pear${isWindows ? '.cmd' : ''}`)

const tmp = os.tmpdir()
const WORKER_PARENT_CLOSE_NAME = 'pear-doctor-worker-parent-close'
const WORKER_PARENT_CLOSE_DIR = path.join(tmp, WORKER_PARENT_CLOSE_NAME)
const WORKER_PARENT_CRASH_NAME = 'pear-doctor-worker-parent-crash'
const WORKER_PARENT_CRASH_DIR = path.join(tmp, WORKER_PARENT_CRASH_NAME)

const applink = config.alias ? `pear://${config.alias}` : config.applink

customElements.define(
  'doctor-checklist',
  class extends HTMLElement {
    constructor() {
      super()
      this.root = this.attachShadow({ mode: 'open' })
      this.db = HyperDB.rocks(
        path.join(Pear.config.args[0] || Pear.config.storage, 'checklist'),
        dbSpec
      )
      this.state = { started: false }
      this.sections = sections
      this.items = new Map()
      this.eventListeners = new Map()
      this.entrypoint = new URLSearchParams(window.location.search).get(
        'source'
      )
      this.linkData = typeof config.linkData === 'string'
      this.isInviteCode = config.fragment && this.#isKeetInvite(config.fragment)
      this.platformLength = null
      this.downloads = null
      this.randomKey = randomBytes(32).toString('hex')

      const nested = localStorage.getItem('nested-entrypoint')
      if (nested) this.entrypoint = 'nested-entrypoint'
      localStorage.removeItem('nested-entrypoint')

      this.#renderLoading()

      Pear.teardown(async () => {
        await this.db.flush()
        await this.db.close()
      }, 100000)

      versions().then(async ({ platform }) => {
        const v = ({ key, length, fork }) => `${fork}.${length}.${key}`
        const platformVersion = v(platform)
        this.storageKey = platformVersion

        for (const file of await this.db.find('@doctor/checklist').toArray()) {
          if (!file.key.includes(platformVersion)) {
            await this.db.delete('@doctor/checklist', { key: file.key })
          }
        }

        this.platformLength = platform.length
        this.state = await this.#loadState()

        this.#render()

        Object.keys(this.state).forEach((key) => {
          if (key.startsWith('status-')) {
            this.#updateState({ [key]: undefined })
          }
        })

        this.locationFragment = 'fragment'
        this.locationQuery = 'query'

        if (this.linkData)
          this.#updateState({
            COLD_START_LINK: this.#isValidLinkData(config.linkData)
          })
        if (this.entrypoint?.length > 1 && !this.isInviteCode)
          this.#updateState({
            COLD_START_ENTRYPOINT: this.#isValidEntrypoint(config.entrypoint)
          })

        if (config.fragment?.length > 0 && !this.isInviteCode) {
          this.#updateState({
            COLD_START_FRAGMENT: this.#isValidFragment(config.fragment)
          })
          if (this.entrypoint?.length > 1)
            this.#updateState({
              COLD_START_ENTRYPOINT_FRAGMENT:
                this.#isValidEntrypoint(config.entrypoint) &&
                this.#isValidFragment(config.fragment)
            })
        }

        if (
          (config.fragment?.length > 0 || this.locationFragment) &&
          this.isInviteCode
        ) {
          this.#updateState({
            COLD_START_INVITE_CODE: this.#isValidInviteCode(config.fragment)
          })
        }

        if (config.query?.length > 0 && !this.isInviteCode) {
          this.#updateState({
            COLD_START_QUERY: this.#isValidQuery(config.query)
          })
          if (this.entrypoint?.length > 1)
            this.#updateState({
              COLD_START_ENTRYPOINT_QUERY:
                this.#isValidEntrypoint(config.entrypoint) &&
                this.#isValidQuery(config.query)
            })
        }

        wakeups((wakeup) => {
          const url = new URL(wakeup.link)
          const isFromInside = url.searchParams.get('source') === 'inside-app'
          const isInviteCode =
            wakeup.fragment && this.#isKeetInvite(wakeup.fragment)

          if (typeof wakeup.linkData === 'string')
            this.#updateState({
              WAKE_UP_LINK: this.#isValidLinkData(wakeup.linkData)
            })
          if (typeof wakeup.linkData === 'string' && isFromInside)
            this.#updateState({
              WAKE_UP_LINK_FROM_INSIDE_APP: this.#isValidLinkData(
                wakeup.linkData
              )
            })

          if (wakeup.entrypoint?.length > 1 && !isInviteCode)
            this.#updateState({
              WAKE_UP_ENTRYPOINT: this.#isValidEntrypoint(wakeup.entrypoint)
            })

          if (wakeup.fragment?.length > 0 && !isInviteCode) {
            this.#updateState({
              WAKE_UP_FRAGMENT: this.#isValidFragment(wakeup.fragment, {
                noLocationCheck: true
              })
            })
            if (wakeup.entrypoint?.length > 1)
              this.#updateState({
                WAKE_UP_ENTRYPOINT_FRAGMENT:
                  this.#isValidEntrypoint(wakeup.entrypoint) &&
                  this.#isValidFragment(wakeup.fragment, {
                    noLocationCheck: true
                  })
              })
          }

          if (wakeup.fragment?.length > 0 && isInviteCode) {
            this.#updateState({
              WAKE_UP_INVITE_CODE: this.#isValidInviteCode(wakeup.fragment, {
                noLocationCheck: true
              })
            })
          }

          if (wakeup.query?.length > 0 && !isInviteCode) {
            this.#updateState({
              WAKE_UP_QUERY: this.#isValidQuery(wakeup.query, {
                noLocationCheck: true
              })
            })
            if (wakeup.entrypoint?.length > 1)
              this.#updateState({
                WAKE_UP_ENTRYPOINT_QUERY:
                  this.#isValidEntrypoint(wakeup.entrypoint) &&
                  this.#isValidQuery(wakeup.query, { noLocationCheck: true })
              })
          }

          ui.app.focus({ steal: true }).catch(console.log)
        })
      })
    }

    #isValidLinkData(linkData) {
      if (linkData === null) return
      if (typeof linkData === 'string' && !linkData.trim().startsWith('/'))
        return true
      return false
    }

    #isValidEntrypoint(entrypoint) {
      if (entrypoint === null || this.source === null) return
      if (typeof entrypoint !== 'string') return false

      entrypoint = entrypoint.trim()
      if (entrypoint !== '/nested/entrypoint.html') return false
      if (
        entrypoint === '' ||
        (entrypoint.startsWith('/') && entrypoint.length === 1)
      )
        return false
      if (this.#isKeetInvite(entrypoint)) return false

      return true
    }

    #isValidFragment(fragment, opts) {
      if (fragment === null) return
      if (
        typeof fragment === 'string' &&
        fragment.trim() !== '' &&
        !fragment.startsWith('#') &&
        (fragment === this.locationFragment || opts.noLocationCheck)
      )
        return true
      return false
    }

    #isValidQuery(query, opts) {
      if (query === null) return
      if (
        typeof query === 'string' &&
        query.trim() !== '' &&
        !query.startsWith('?') &&
        (query === this.locationQuery || opts.noLocationCheck)
      )
        return true
      return false
    }

    #isValidHash() {
      return location.hash.startsWith('#')
    }

    #isValidInviteCode(str, opts) {
      if (!this.#isValidHash() && !opts.noLocationCheck) return false
      if (!this.#isValidFragment(str, opts)) return false
      return this.#isKeetInvite(str)
    }

    #isKeetInvite(str) {
      if (!str || str.length < 100) return false
      try {
        z32.decode(str)
      } catch {
        return false
      }
      return true
    }

    async #loadState() {
      const state = await this.db.get('@doctor/checklist', {
        key: this.storageKey
      })
      return state ? JSON.parse(state.value) : { started: false }
    }

    async #saveState() {
      await this.db.insert('@doctor/checklist', {
        key: this.storageKey,
        value: JSON.stringify(this.state)
      })
    }

    async #updateState(state, opts = {}) {
      if (!state.started && !opts.reset) state.started = true
      if (opts.reset) this.state = {}
      Object.assign(this.state, state)
      await this.#saveState()
      this.#onupdate()
    }

    #onupdate() {
      this.shadowRoot.querySelector('#checklist').innerHTML =
        this.#renderChecklist()
      this.#updateButton()
      this.#attachEventListeners()
    }

    #renderChecklist() {
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
          .map((item, index) => {
            i++
            this.items.set(item.id, i)
            const isActive =
              !this.platformLength ||
              Number(this.platformLength) > item.activeFromLength
            const isInactive =
              !this.state.started ||
              !isActive ||
              !!this.state[`status-${item.id}`]
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
          })
          .join('')}
      </div>
    `
        )
        .join('')
    }

    #updateButton() {
      const startButton = this.shadowRoot.querySelector('start-button')
      startButton.setAttribute('started', this.state.started)
    }

    #attachEventListeners() {
      const startButton = this.shadowRoot.querySelector('start-button')
      const cloned = startButton.cloneNode(true)
      startButton.parentNode.replaceChild(cloned, startButton)
      cloned.addEventListener('button-click', () => {
        this.state.started ? this.#resetChecks() : this.#startChecks()
      })

      this.shadowRoot.querySelectorAll('action-button').forEach((button) => {
        if (this.eventListeners.has(button))
          button.removeEventListener(
            'action-button-click',
            this.eventListeners.get(button)
          )

        const listener = (event) => {
          const { type, action } = event.detail
          if (type === 'Nurse') this.#openNurse()
          if (type === 'Microphone' && action === 'Status')
            this.#getMicrophoneStatus()
          if (type === 'Camera' && action === 'Status') this.#getCameraStatus()
          if (type === 'Screen' && action === 'Status') this.#getScreenStatus()
          if (type === 'Microphone' && action === 'Access')
            this.#getMicrophoneAccess()
          if (type === 'Camera' && action === 'Access') this.#getCameraAccess()
          if (type === 'Screen' && action === 'Access') this.#getScreenAccess()
          if (type === 'DHT-Nodes' && action === 'Check') this.#dhtNodes()
          if (type === 'Teardown-Normal' && action === 'Check')
            this.#teardownNormal()
          if (type === 'Teardown-Reject' && action === 'Check')
            this.#teardownReject()
          if (type === 'Teardown-Force' && action === 'Check')
            this.#teardownForce()
          if (type === 'Restart-Platform' && action === 'Restart')
            this.#restartPlatform()
          if (type === 'Restart-Platform' && action === 'Check')
            this.#restartPlatformCheck()
          if (type === 'Restart-Client' && action === 'Restart')
            this.#restartClient()
          if (type === 'Restart-Client' && action === 'Check')
            this.#restartClientCheck()
          if (type === 'Worker-Subprocess' && action === 'Check')
            this.#workerSubprocess()
          if (type === 'Worker-Parent-End' && action === 'Check')
            this.#workerParentEnd()
          if (type === 'Worker-Parent-Destroy' && action === 'Check')
            this.#workerParentDestroy()
          if (type === 'Worker-Child-End' && action === 'Check')
            this.#workerChildEnd()
          if (type === 'Worker-Child-Destroy' && action === 'Check')
            this.#workerChildDestroy()
          if (type === 'Worker-Parent-Close' && action === 'Close')
            this.#workerParentClose()
          if (type === 'Worker-Parent-Close' && action === 'Check')
            this.#workerParentCloseCheck()
          if (type === 'Worker-Parent-Crash' && action === 'Crash')
            this.#workerParentCrash()
          if (type === 'Worker-Parent-Crash' && action === 'Check')
            this.#workerParentCrashCheck()

          if (type === 'Tray-Default' && action === 'Run')
            this.#trayDefaultRun()
          if (type === 'Tray-Default' && action === 'Check')
            this.#trayDefaultCheck()
          if (type === 'Tray-Custom-Icon' && action === 'Run')
            this.#trayCustomIconRun()
          if (type === 'Tray-Custom-Icon' && action === 'Check')
            this.#trayCustomIconCheck()
          if (type === 'Tray-Custom-Menu' && action === 'Run')
            this.#trayCustomMenuRun()
          if (type === 'Tray-Custom-Menu' && action === 'Check')
            this.#trayCustomMenuCheck()
          if (type === 'Tray-Multiple-Runs' && action === 'Run')
            this.#trayMultipleRunsRun()
          if (type === 'Tray-Multiple-Runs' && action === 'Check')
            this.#trayMultipleRunsCheck()

          if (type === 'User-Agent' && action === 'Check')
            this.#userAgentCheck()
          if (type === 'External-Link' && action === 'Check')
            this.#externalLinkCheck()
          if (type === 'Storage-Check' && action === 'Check')
            this.#storageCheck()
        }

        button.addEventListener('action-button-click', listener)
        this.eventListeners.set(button, listener)
      })

      if (this.eventListeners.has('contextmenu'))
        this.shadowRoot.removeEventListener(
          'contextmenu',
          this.eventListeners.get('contextmenu')
        )
      const contextMenuListener = (e) =>
        e.button === 2 && this.#updateState({ MISC_MOUSE_RIGHT_CLICK: true })
      this.shadowRoot.addEventListener('contextmenu', contextMenuListener)
      this.eventListeners.set('contextmenu', contextMenuListener)
    }

    async #resetChecks() {
      const state = { started: false }
      this.#updateState(state, { reset: true })
      this.randomKey = randomBytes(32).toString('hex')

      await fs.promises.rm(WORKER_PARENT_CLOSE_DIR, {
        recursive: true,
        force: true
      })
      await fs.promises.rm(WORKER_PARENT_CRASH_DIR, {
        recursive: true,
        force: true
      })
    }

    #startChecks() {
      this.#updateState({ started: true })
    }

    #openNurse() {
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

      if (!this.downloads)
        this.downloads = pearUserDirs({ sync: true }).downloads
      const destPath = path.join(this.downloads, 'nurse.html')

      try {
        fs.writeFile(destPath, nurse, (err) => {
          if (err) return console.log(err)
          const command = isWindows
            ? 'start'
            : isMac
              ? 'open'
              : isLinux
                ? 'xdg-open'
                : null
          if (!command) return
          const args = [destPath]
          spawn(command, args, { shell: true })
        })
      } catch {
        /* ignore */
      }
    }

    #getMicrophoneStatus() {
      ui.media.status.microphone().then((res) => {
        this.#updateState({ MEDIA_MICROPHONE_STATUS: res === 'granted' })
      })
    }

    #getCameraStatus() {
      ui.media.status.camera().then((res) => {
        this.#updateState({ MEDIA_CAMERA_STATUS: res === 'granted' })
      })
    }

    #getScreenStatus() {
      ui.media.status.screen().then((res) => {
        this.#updateState({ MEDIA_SCREEN_STATUS: res === 'granted' })
      })
    }

    #getMicrophoneAccess() {
      ui.media.access.microphone().then((res) => {
        this.#updateState({
          MEDIA_MICROPHONE_ACCESS: res === true || res === 'granted'
        })
      })
    }

    #getCameraAccess() {
      ui.media.access.camera().then((res) => {
        this.#updateState({
          MEDIA_CAMERA_ACCESS: res === true || res === 'granted'
        })
      })
    }

    #getScreenAccess() {
      ui.media.access.screen().then((res) => {
        this.#updateState({ MEDIA_SCREEN_ACCESS: res === 'granted' })
      })
    }

    async #dhtNodes() {
      this.#updateState({ LIFECYCLE_DHT_NODES: config.dht?.nodes?.length > 0 })
    }

    #teardownNormal() {
      teardown(
        () =>
          new Promise((resolve) => {
            console.log('Start teardown normal')
            setTimeout(async () => {
              console.log('Done Teardown normal')
              await this.#updateState({ LIFECYCLE_TEARDOWN_NORMAL: true })
              resolve()
            }, 1000) // MAX_TEARDOWN_WAIT is 15000
          })
      )
      ui.app.quit()
    }

    #teardownReject() {
      teardown(
        () =>
          new Promise((resolve, reject) => {
            console.log('Start teardown reject')
            setTimeout(async () => {
              await this.#updateState({ LIFECYCLE_TEARDOWN_REJECT: true })
              await this.db.flush()
              reject(new Error('Teardown rejection'))
            }, 0)
          })
      )
      ui.app.quit()
    }

    #teardownForce() {
      teardown(() =>
        Promise.all([
          new Promise((resolve) => {
            console.log('Start teardown force')
            setTimeout(async () => {
              console.log('Done teardown force')
              await this.#updateState({ LIFECYCLE_TEARDOWN_FORCE: true })
              await this.db.flush()
              resolve()
            }, 14000) // MAX_TEARDOWN_WAIT is 15000
          }),
          new Promise((resolve) => {
            console.log('Start teardown force - never resolved')
            setTimeout(async () => {
              console.log('Done teardown force - never happened')
              await this.#updateState({ LIFECYCLE_TEARDOWN_FORCE: false })
              await this.db.flush()
              resolve()
            }, 16000) // MAX_TEARDOWN_WAIT is 15000
          })
        ])
      )
      ui.app.quit()
    }

    async #restartPlatform() {
      await Pear.restart({ platform: true })
    }

    async #restartPlatformCheck() {
      this.#updateState({ LIFECYCLE_RESTART_PLATFORM: true })
    }

    async #restartClient() {
      await Pear.restart({ platform: false })
    }

    async #restartClientCheck() {
      this.#updateState({ LIFECYCLE_RESTART_CLIENT: true })
    }

    async #workerSubprocess() {
      // needs to be replaced by pear-run
      const link = Pear.key
        ? `${Pear.config.applink}/subprocess/index.js`
        : path.join(Pear.config.dir, 'subprocess', 'index.js')
      const pipe = run(link)
      pipe.once('data', (data) => {
        const ping = Buffer.from(data).toString()
        if (ping === 'ping') this.#updateState({ WORKER_SUBPROCESS: true })
      })
    }

    async #workerParentEnd() {
      const name = 'pear-doctor-worker-child-end'
      const tmpDir = path.join(tmp, name)
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      await fs.promises.mkdir(tmpDir, { recursive: true })
      await fs.promises.writeFile(
        path.join(tmpDir, 'index.js'),
        `
        const pipe = require('pear-pipe')()
        pipe.write(Bare.pid.toString())
      `
      )
      await fs.promises.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name,
          main: 'index.js',
          pear: {},
          dependencies: { 'pear-pipe': 'latest' }
        })
      )

      const npmi = spawn('npm', ['install'], {
        cwd: tmpDir,
        stdio: 'ignore',
        shell: !!isWindows
      })
      await new Promise((resolve, reject) =>
        npmi.on('exit', (code) => (code === 0 ? resolve(code) : reject(code)))
      )

      const pipe = run(tmpDir)
      const pid = await new Promise((resolve) => {
        pipe.on('data', (data) => resolve(data.toString()))
      })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      pipe.end()
      try {
        await untilWorkerExit(pid)
        this.#updateState({ WORKER_PARENT_END: true })
      } catch {
        this.#updateState({ WORKER_PARENT_END: false })
      }
    }

    async #workerParentDestroy() {
      const name = 'pear-doctor-worker-child-destroy'
      const tmpDir = path.join(tmp, name)
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      await fs.promises.mkdir(tmpDir, { recursive: true })
      await fs.promises.writeFile(
        path.join(tmpDir, 'index.js'),
        `
        const pipe = require('pear-pipe')()
        pipe.on('error', (err) => {
          if (err.code === 'ENOTCONN') return
          throw err
        })
        pipe.write(Bare.pid.toString())
      `
      )
      await fs.promises.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name,
          main: 'index.js',
          pear: {},
          dependencies: { 'pear-pipe': 'latest' }
        })
      )

      const npmi = spawn('npm', ['install'], {
        cwd: tmpDir,
        stdio: 'ignore',
        shell: !!isWindows
      })
      await new Promise((resolve, reject) =>
        npmi.on('exit', (code) => (code === 0 ? resolve(code) : reject(code)))
      )

      const pipe = run(tmpDir)
      const pid = await new Promise((resolve) => {
        pipe.on('data', (data) => resolve(data.toString()))
      })
      await new Promise((resolve) => setTimeout(resolve, 1000))
      pipe.destroy()
      try {
        await untilWorkerExit(pid)
        this.#updateState({ WORKER_PARENT_DESTROY: true })
      } catch {
        this.#updateState({ WORKER_PARENT_DESTROY: false })
      }
    }

    async #workerChildEnd() {
      const name = 'pear-doctor-worker-child-end'
      const tmpDir = path.join(tmp, name)
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      await fs.promises.mkdir(tmpDir, { recursive: true })
      await fs.promises.writeFile(
        path.join(tmpDir, 'index.js'),
        `
        import pearPipe from 'pear-pipe'
        const pipe = pearPipe()
        pipe.write(Bare.pid.toString())
        await new Promise((resolve) => setTimeout(resolve, 1000))
        pipe.end()
      `
      )
      await fs.promises.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name,
          main: 'index.js',
          type: 'module',
          pear: {},
          dependencies: { 'pear-pipe': 'latest' }
        })
      )

      const npmi = spawn('npm', ['install'], {
        cwd: tmpDir,
        stdio: 'ignore',
        shell: !!isWindows
      })
      await new Promise((resolve, reject) =>
        npmi.on('exit', (code) => (code === 0 ? resolve(code) : reject(code)))
      )

      const pipe = run(tmpDir)
      const pid = await new Promise((resolve) => {
        pipe.on('data', (data) => resolve(data.toString()))
      })
      try {
        await untilWorkerExit(pid)
        this.#updateState({ WORKER_CHILD_END: true })
      } catch {
        this.#updateState({ WORKER_CHILD_END: false })
      }
    }

    async #workerChildDestroy() {
      const name = 'pear-doctor-worker-child-destroy'
      const tmpDir = path.join(tmp, name)
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      await fs.promises.mkdir(tmpDir, { recursive: true })
      await fs.promises.writeFile(
        path.join(tmpDir, 'index.js'),
        `
        import pearPipe from 'pear-pipe'
        const pipe = pearPipe()
        pipe.on('error', (err) => {
          if (err.code === 'ENOTCONN') return
          throw err
        })
        pipe.write(Bare.pid.toString())
        await new Promise((resolve) => setTimeout(resolve, 1000))
        pipe.destroy()
      `
      )
      await fs.promises.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name,
          main: 'index.js',
          type: 'module',
          pear: {},
          dependencies: { 'pear-pipe': 'latest' }
        })
      )

      const npmi = spawn('npm', ['install'], {
        cwd: tmpDir,
        stdio: 'ignore',
        shell: !!isWindows
      })
      await new Promise((resolve, reject) =>
        npmi.on('exit', (code) => (code === 0 ? resolve(code) : reject(code)))
      )

      const pipe = run(tmpDir)
      const pid = await new Promise((resolve) => {
        pipe.on('data', (data) => resolve(data.toString()))
      })
      try {
        await untilWorkerExit(pid)
        this.#updateState({ WORKER_CHILD_DESTROY: true })
      } catch {
        this.#updateState({ WORKER_CHILD_DESTROY: false })
      }
    }

    async #workerParentClose() {
      this.#updateState({ WORKER_PARENT_CLOSE: undefined })
      const tmpDir = WORKER_PARENT_CLOSE_DIR
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      await fs.promises.mkdir(tmpDir, { recursive: true })
      await fs.promises.writeFile(
        path.join(tmpDir, 'index.js'),
        `
        const fs = require('bare-fs')
        const path = require('bare-path')
        
        const outputPath = path.join(${JSON.stringify(tmpDir)}, "output.tmp")
        Pear.teardown(() => fs.appendFileSync(outputPath, 'exited\\n', 'utf8'))

        const pipe = require('pear-pipe')()
        pipe.on('data', () => fs.appendFileSync(outputPath, 'started\\n', 'utf8'))
        pipe.on('end', () => fs.appendFileSync(outputPath, 'ended\\n', 'utf8'))

        pipe.write(JSON.stringify({ tag: 'ready' }))
      `
      )
      await fs.promises.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: WORKER_PARENT_CLOSE_NAME,
          main: 'index.js',
          pear: { type: 'terminal' },
          dependencies: {
            'bare-fs': 'latest',
            'bare-path': 'latest',
            'pear-pipe': 'latest'
          }
        })
      )

      const npmi = spawn('npm', ['install'], {
        cwd: tmpDir,
        stdio: 'ignore',
        shell: !!isWindows
      })
      await new Promise((resolve, reject) =>
        npmi.on('exit', (code) => (code === 0 ? resolve(code) : reject(code)))
      )

      const pipe = run(tmpDir)
      await pipeUntil({ pipe, tag: 'ready' })

      setTimeout(() => ui.app.quit(), 2000)
    }

    async #workerParentCloseCheck() {
      const outputPath = path.join(WORKER_PARENT_CLOSE_DIR, 'output.tmp')
      const contents = await fs.promises.readFile(outputPath, 'utf8')
      const lines = contents.split('\n')
      const lastLine = lines[lines.length - 2]

      if (lastLine === 'exited')
        this.#updateState({ WORKER_PARENT_CLOSE: true })
    }

    async #workerParentCrash() {
      this.#updateState({ WORKER_PARENT_CRASH: undefined })
      const tmpDir = WORKER_PARENT_CRASH_DIR
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      await fs.promises.mkdir(tmpDir, { recursive: true })
      await fs.promises.writeFile(
        path.join(tmpDir, 'index.js'),
        `
        const fs = require('bare-fs')
        const path = require('bare-path')
        
        const outputPath = path.join(${JSON.stringify(tmpDir)}, "output.tmp")
        Pear.teardown(() => fs.appendFileSync(outputPath, 'exited\\n', 'utf8'))

        const pipe = require('pear-pipe')()
        pipe.on('data', () => fs.appendFileSync(outputPath, 'started\\n', 'utf8'))
        pipe.on('end', () => fs.appendFileSync(outputPath, 'ended\\n', 'utf8'))

        pipe.write(JSON.stringify({ tag: 'ready' }))
      `
      )
      await fs.promises.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: WORKER_PARENT_CRASH_NAME,
          main: 'index.js',
          pear: { type: 'terminal' },
          dependencies: {
            'bare-fs': 'latest',
            'bare-path': 'latest',
            'pear-pipe': 'latest'
          }
        })
      )

      const npmi = spawn('npm', ['install'], {
        cwd: tmpDir,
        stdio: 'ignore',
        shell: !!isWindows
      })
      await new Promise((resolve, reject) =>
        npmi.on('exit', (code) => (code === 0 ? resolve(code) : reject(code)))
      )

      const pipe = run(tmpDir)
      await pipeUntil({ pipe, tag: 'ready' })

      setTimeout(() => process.crash(), 2000)
    }

    async #workerParentCrashCheck() {
      const outputPath = path.join(WORKER_PARENT_CRASH_DIR, 'output.tmp')
      const contents = await fs.promises.readFile(outputPath, 'utf8')
      const lines = contents.split('\n')
      const lastLine = lines[lines.length - 2]

      if (lastLine === 'exited')
        this.#updateState({ WORKER_PARENT_CRASH: true })
    }

    async #userAgentCheck() {
      const port = 8766
      const host = '127.0.0.1'

      const httpServer = new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
          res.end(req.headers['user-agent'])
        })
        server.once('error', (err) => reject(err))
        server.listen(port, host, () => resolve(true))
      })
      await httpServer

      const res = await fetch(`http://${host}:${port}`)
      const text = await res.text()
      this.#updateState({
        MISC_USER_AGENT: text === Pear.config.options.gui.userAgent
      })
    }

    async #trayDefaultRun() {
      this.#updateState({ TRAY_DEFAULT: undefined })
      await ui.app.tray()
    }

    async #trayDefaultCheck() {
      this.#updateState({ TRAY_DEFAULT: true })
    }

    async #trayCustomIconRun() {
      this.#updateState({ TRAY_CUSTOM_ICON: undefined })
      await ui.app.tray({ icon: 'assets/Pear-white-16px.png' })
    }

    async #trayCustomIconCheck() {
      this.#updateState({ TRAY_CUSTOM_ICON: true })
    }

    async #trayCustomMenuRun() {
      this.#updateState({ TRAY_CUSTOM_MENU: undefined })
      await ui.app.tray({ menu: { foo: 'Foo', bar: 'Bar' } }, (key) => {
        if (key === 'foo') alert('Foo clicked')
        if (key === 'bar') alert('Bar clicked')
      })
    }

    async #trayCustomMenuCheck() {
      this.#updateState({ TRAY_CUSTOM_MENU: true })
    }

    async #trayMultipleRunsRun() {
      this.#updateState({ TRAY_MULTIPLE_RUNS: undefined })
      await ui.app.tray()
      await ui.app.tray({ icon: 'assets/Pear-white-16px.png' })
      await ui.app.tray({ menu: { foo: 'Foo', bar: 'Bar' } })
      await ui.app.tray(
        {
          icon: 'assets/Pear-white-16px.png',
          menu: { foo: 'Foo', bar: 'Bar' }
        },
        (key) => {
          if (key === 'foo') alert('Foo clicked')
          if (key === 'bar') alert('Bar clicked')
        }
      )

      // TODO: fix this test in pear-next
    }

    async #trayMultipleRunsCheck() {
      this.#updateState({ TRAY_MULTIPLE_RUNS: true })
    }

    #externalLinkCheck() {
      this.#updateState({ MISC_EXTERNAL_LINK: true })
    }

    #storageCheck() {
      const expectedStorageDir = path.join(
        Pear.config.pearDir,
        'app-storage',
        Pear.config.key ? 'by-dkey' : 'by-random'
      )
      const currentStorageDir = path.dirname(Pear.config.storage)
      const storageFolder = path.basename(Pear.config.storage)
      const dkey = Pear.key ? discoveryKey(Pear.key).toString('hex') : null
      this.#updateState({
        STORAGE:
          expectedStorageDir === currentStorageDir &&
          (Pear.key ? dkey === storageFolder : true)
      })
    }

    #renderLoading() {
      this.shadowRoot.innerHTML = `
        <div id="panel">
          <div>Loading...</div>
        </div>
      `
    }

    #render() {
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

async function pipeUntil({ pipe, tag }) {
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

async function pipeUntilClose({ pipe }) {
  const res = new Promise((resolve) => {
    pipe.on('close', () => resolve('closed'))
    pipe.on('end', () => resolve('ended'))
  })
  return res
}

async function spawnUntil({ sc, tag }) {
  return new Promise((resolve, reject) => {
    sc.stdout.on('data', (data) => {
      try {
        const lines = data
          .toString()
          .split('\n')
          .map((line) => line.trim())
          .map((line) => line.replace(/^,/, ''))
          .filter((line) => line)
          .map((line) => JSON.parse(line))
        const found = lines.find((line) => line.tag === tag)
        if (found) resolve(found.data)
      } catch (e) {
        console.log(data.toString())
        console.log(e)
        reject(e)
      }
    })
  })
}

async function untilWorkerExit(pid, timeout = 5000) {
  const start = Date.now()
  while (isRunning(pid)) {
    if (Date.now() - start > timeout) throw new Error('timed out')
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

function isRunning(pid) {
  try {
    // 0 is a signal that doesn't kill the process, just checks if it's running
    return process.kill(pid, 0)
  } catch (err) {
    return err.code === 'EPERM'
  }
}

function sanitizePath(input) {
  let path = input.replaceAll(' ', '\\ ')
  path = isWindows ? path.replaceAll('\\', '\\\\') : path
  return path
}

