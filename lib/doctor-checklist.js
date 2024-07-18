/* global Pear */
/* eslint-env browser */

import z32 from 'z32'
import { sections } from './sections.js'
import './start-button.js'
import './info-tooltip.js'
import './action-button.js'
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
      this.isInviteCode = config.fragment && this.#isKeetInvite(config.fragment)
      this.platformLength = null

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
            (item, index) => {
              const isActive = item.activeFromLength < Number(this.platformLength)
              return `
            <div class="list-item " style="margin-left: 1.25rem;">
              <input
                type="checkbox"
                id="item-${index}"
                ${this.state[item.id] === true && isActive ? 'checked' : ''}
                class="check-item ${!this.state.started || !isActive ? 'inactive' : ''}
                ${this.state[item.id] === false && isActive ? 'red-cross' : ''}"
                ${!this.state.started ? 'disabled' : ''}>
              <label for="item-${index}" class="${this.state.started ? '' : 'disabled-label'} label ${!this.state.started || !isActive ? 'inactive' : ''}">${item.text}</label>
              <info-tooltip info-text="${isActive ? item.tooltip : item.tooltipInactive || 'This check is currently disabled.'}"></info-tooltip>
              ${item.link ? `<action-button action="Link" type="Click" href="${item.link}" class="${!this.state.started || !isActive ? 'inactive' : ''}" applink="${config.applink}"></action-button>` : ''}
              ${item.button ? `<${item.button} action="${item.action}" type="${item.type}" class="${!this.state.started || !isActive ? 'inactive' : ''}"></${item.button}>` : ''}
            </div>
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

      const newStartButton = startButton.cloneNode(true)
      startButton.parentNode.replaceChild(newStartButton, startButton)

      newStartButton.addEventListener('button-click', () => {
        if (this.state.started) {
          this.#resetChecks()
        } else {
          this.#startChecks()
        }
      })

      this.shadowRoot.querySelectorAll('action-button').forEach(button => {
        button.addEventListener('action-button-click', (event) => {
          if (event.detail.type === 'Application' && event.detail.action === 'Update') {
            this.#applicationUpdate()
          }
          if (event.detail.type === 'Platform' && event.detail.action === 'Update') {
            this.#platformUpdate()
          }
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

    #applicationUpdate () {
      // TODO: #applicationUpdate'
    }

    #platformUpdate () {
      // TODO: #platformUpdate
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
              z-index:2;
            }

            .list-container h1.green {
              margin-right: 2rem;
              margin-bottom: 0.5rem;
              margin-top: 1rem;
            }

            .list-container {
              padding-left: 2rem;
            }

            .list-item {
              margin-bottom: 0.625rem;
              position: relative;
              display: flex;
              align-items: center;
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
          </style>
          <div class="list-container">
            <div class="header-container">
              <h1 class="green">Pear Doctor</h1>
              <start-button started="${this.state.started}"></start-button>
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
