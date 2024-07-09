/* global Pear */
/* eslint-env browser */

import { sections } from './sections.js'
import './start-button.js'
import './side-panel.js'
import './info-tooltip.js'
import './media-button.js'
import './pear-version.js'
const { versions, config, wakeups, Window } = Pear

customElements.define(
  'doctor-checklist',
  class extends HTMLElement {
    constructor () {
      super()
      this.root = this.attachShadow({ mode: 'open' })
      this.storage = global.localStorage
      this.state = { started: false }
      this.sections = sections
      this.entrypoint = new URLSearchParams(window.location.search).get('source')
      this.linkData = typeof config.linkData === 'string'
      this.inviteCode = config.fragment && this.#isInviteCode(config.fragment)

      const nested = localStorage.getItem('nested-entrypoint')
      if (nested) this.entrypoint = 'nested-entrypoint'
      localStorage.removeItem('nested-entrypoint')

      this.#renderLoading()

      versions().then(({ app, platform }) => {
        const platformVersion = `${platform.fork}.${platform.length}.${platform.key}`
        const appVersion = `${app.fork}.${app.length}.${app.key}`
        this.storageKey = platformVersion

        for (const key in this.storage) {
          if (key !== platformVersion) {
            this.storage.removeItem(key)
          }
        }

        this.state = this.#loadState()

        this.#render()

        const pearVersion = this.shadowRoot.querySelector('pear-version')
        pearVersion.platformVersion = platformVersion
        pearVersion.appVersion = appVersion

        this.locationFragment = location.hash.split('#').slice(1).join('')

        if (this.linkData) this.#updateState({ COLD_START_LINK: this.#isValidLinkData(config.linkData) })
        if (this.entrypoint) this.#updateState({ COLD_START_ENTRYPOINT: this.#isValidEntrypoint(config.entrypoint) })

        if (this.locationFragment && !this.inviteCode) {
          this.#updateState({ COLD_START_FRAGMENT: this.#isValidFragment(config.fragment) })
          this.#updateState({ COLD_START_ENTRYPOINT_FRAGMENT: this.#isValidEntrypoint(config.entrypoint) && this.#isValidFragment(config.fragment) })
        }

        if (this.locationFragment && this.inviteCode) {
          this.#updateState({ COLD_START_INVITE_CODE: this.#isValidInviteCode(config.fragment) })
        }

        wakeups((wakeup) => {
          if (typeof wakeup.linkData === 'string') this.#updateState({ WAKE_UP_LINK: this.#isValidLinkData(wakeup.linkData) })

          if (wakeup.entrypoint === '/nested/entrypoint.html') {
            this.#updateState({ WAKE_UP_ENTRYPOINT: this.#isValidEntrypoint(wakeup.entrypoint) })
          }

          this.#updateState({ WAKE_UP_FRAGMENT: this.#isValidFragment(wakeup.fragment) })
          this.#updateState({ WAKE_UP_ENTRYPOINT_FRAGMENT: this.#isValidEntrypoint(wakeup.entrypoint) && this.#isValidFragment(wakeup.fragment) })
          this.#updateState({ WAKE_UP_INVITE_CODE: this.#isValidInviteCode(wakeup.fragment) })

          Window.self.focus({ steal: true }).catch(console.error)
        })
      })
    }

    #isValidLinkData (linkData) {
      if (linkData === null) return
      if (typeof linkData === 'string') return true
      return false
    }

    #isValidEntrypoint (entrypoint) {
      if (entrypoint === null || this.source === null) return
      if (typeof entrypoint === 'string' && entrypoint.trim() !== '' && entrypoint.trim() !== '/') return true
      return false
    }

    #isValidFragment (fragment) {
      if (fragment === null) return
      if (typeof fragment === 'string' && fragment.trim() !== '' && !fragment.startsWith('#') && fragment === this.locationFragment) return true
      return false
    }

    #isValidHash () {
      return location.hash.startsWith('#')
    }

    #isValidInviteCode (str) {
      if (!this.#isValidHash()) return false
      if (!this.#isValidFragment(str)) return false
      return this.#isInviteCode(str)
    }

    #isInviteCode (str) {
      const ALPHABET = 'ybndrfg8ejkmcpqxot1uwisza345h769'

      const z32Set = new Set(ALPHABET)
      let count = 0

      for (const char of str) {
        if (z32Set.has(char)) {
          count++
          if (count >= 100) {
            return true
          }
        }
      }

      return false
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
      return this.sections
        .map(
          (section) => `
          <div class="section ${!this.state.started ? 'inactive' : ''}">
            <div class="section-header ${!this.state.started ? 'inactive' : ''}">
              <span class="subheader ${!this.state.started ? 'inactive' : ''}">${section.title}</span>
              <info-tooltip info-text="${section.tooltip}"></info-tooltip>
            </div>
            ${section.items
              .map(
                (item, index) => `
                <div class="list-item ${!this.state.started ? 'inactive' : ''}" style="margin-left: 20px;">
                  <input type="checkbox" id="item-${index}" ${this.state[item.id] === true ? 'checked' : ''} class="check-item ${this.state[item.id] === false ? 'red-cross' : ''}" ${!this.state.started ? 'disabled' : ''}>
                  <label for="item-${index}" class="${this.state.started ? '' : 'disabled-label'} label">${item.text}</label>
                  <info-tooltip info-text="${item.tooltip}"></info-tooltip>
                  ${item.button ? `<${item.button} action="${item.action}" type="${item.type}"></${item.button}>` : ''}
                </div>
              `
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

      const newStartButton = startButton.cloneNode(true)
      startButton.parentNode.replaceChild(newStartButton, startButton)

      newStartButton.addEventListener('button-click', () => {
        if (this.state.started) {
          this.#resetChecks()
        } else {
          this.#startChecks()
        }
      })

      this.shadowRoot.querySelectorAll('media-button').forEach(button => {
        button.addEventListener('media-button-click', (event) => {
          if (event.detail.type === 'Microphone' && event.detail.action === 'Status') {
            this.#getMicrophoneStatus()
          }
          if (event.detail.type === 'Camera' && event.detail.action === 'Status') {
            this.#getCameraStatus()
          }
          if (event.detail.type === 'Screen' && event.detail.action === 'Status') {
            this.#getScreenStatus()
          }
          if (event.detail.type === 'Microphone' && event.detail.action === 'Access') {
            this.#getMicrophoneAccess()
          }
          if (event.detail.type === 'Camera' && event.detail.action === 'Access') {
            this.#getCameraAccess()
          }
          if (event.detail.type === 'Screen' && event.detail.action === 'Access') {
            this.#getScreenAccess()
          }
        })
      })
    }

    #resetChecks () {
      const state = { started: false }
      for (const section of this.sections) {
        for (const item of section.items) {
          delete this.state[item.id]
        }
      }
      this.#updateState(state, { reset: true })
    }

    #startChecks () {
      this.#updateState({ started: true })
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
              font-size: 3rem;
            }

            .list-container {
              padding: 2rem;
            }

            .list-item {
              margin-bottom: 10px;
              position: relative;
              display: flex;
              align-items: center;
            }

            .label {
              pointer-events: none;
              margin-left: 1rem;
              margin-right: 1rem;
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

            .inactive {
              opacity: 0.5;
              pointer-events: none;
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

            .logo {
              margin-bottom: 0.5rem;
            }

            .subheader {
              margin-right: 1rem;
            }

            input[type="checkbox"] {
              appearance: none;
              -webkit-appearance: none;
              -moz-appearance: none;
              display: inline-block;
              width: 20px;
              height: 20px;
              background-color: #151517;
              border: 1px solid #B0D944;
              border-radius: 4px;
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
              width: 10px;
              height: 18px;
              border: 2px solid #B0D944;
              border-width: 0 4px 4px 0;
              transform: rotate(45deg);
              position: absolute;
              bottom: 3px;
              left: 6px;
            }

            input[type="checkbox"].red-cross {
              border: none;
            }

            input[type="checkbox"].red-cross::after {
              content: '✖';
              color: #FF4C4C;
              font-size: 24px;
              position: absolute;
              top:-4px;
              left: 2px;
            }
          </style>
          <div class="list-container">
            <div>
              <h1 class="green">Pear Doctor</h1>
              <start-button started="${this.state.started}"></start-button>
            </div>
            <div id="checklist">
              ${this.#renderChecklist()}
            </div>
          <pear-version></pear-version>
          </div>
          <side-panel>

          </side-panel>
        </div>
      `
      this.#attachEventListeners()
    }
  }
)
