/* global Pear */
/* eslint-env browser */

import runtime from 'which-runtime'
import './start-button.js'
import './side-panel.js'
import './info-tooltip.js'

const ITEM_COLD_START = 1
const ITEM_WAKE_UP = 2
const ITEM_ENTRYPOINT = 3
const ITEM_INVITE_CODE = 4

customElements.define(
  'doctor-checklist',
  class extends HTMLElement {
    constructor () {
      super()
      this.root = this.attachShadow({ mode: 'open' })
      this.storage = global.localStorage
      this.items = [
        {
          id: ITEM_COLD_START,
          text: 'Cold-start link click - link opens app',
          tooltip: 'Make sure this app is closed. Then, open the app by clicking a link: pear://doctor'
        },
        {
          id: ITEM_WAKE_UP,
          text: 'Wake-up link click - link click while app is open',
          tooltip: 'Make sure this app is already open. Then, wake up the app by clicking a link: pear://doctor'
        },
        {
          id: ITEM_ENTRYPOINT,
          text: 'Entrypoint - link click loads entrypoint',
          tooltip: 'Make sure this app is closed. Then, open this app by clicking a link with a valid entrypoint: pear://doctor/index.html'
        },
        {
          id: ITEM_INVITE_CODE,
          text: 'Keet invite code - link click loads invite code as fragment',
          tooltip: 'Open this app by clicking a link with an invite code of type Keet: pear://doctor/yrb5mcgj5...'
        }
      ]
      this.state = { started: false }
      this.#renderLoading()

      Pear.versions().then(({ app, platform }) => {
        const platformVersion = `${platform.fork}.${platform.length}.${platform.key}`
        this.storageKey = platformVersion

        for (const key in this.storage) {
          if (key !== platformVersion) {
            this.storage.removeItem(key)
          }
        }

        this.state = this.#loadState()
        this.storageKey = platformVersion

        this.#render()

        const sidePanel = this.shadowRoot.querySelector('side-panel')
        sidePanel.os = `os ${runtime.platform}`
        sidePanel.platform = `pear ${this.#version(platform)}`
        sidePanel.app = `app ${this.#version(app)}`

        const code = location.hash.split('#').slice(1).join('')

        if (Pear.config.linkData !== null) {
          this.#updateState({ [ITEM_COLD_START]: true })
        }

        if (typeof Pear.config.entrypoint === 'string' && Pear.config.entrypoint.trim() !== '') {
          this.#updateState({ [ITEM_ENTRYPOINT]: true })
        }

        const isValidFragment = typeof Pear.config.fragment === 'string' && Pear.config.fragment.trim() !== '' && Pear.config.fragment === code
        const isValidHash = location.hash.startsWith('#')
        const isValidInviteCode = this.#isValidInviteCode(code)

        if (isValidFragment && isValidHash && isValidInviteCode) {
          this.#updateState({ [ITEM_INVITE_CODE]: true })
        }

        Pear.wakeups(() => {
          this.#updateState({ [ITEM_WAKE_UP]: true })
          Pear.Window.self.focus({ steal: true }).catch(console.error)
        })
      })
    }

    #isValidInviteCode (str) {
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

    #version ({ key, length, fork }) {
      return `v${fork}.${length}.${(key += '').length <= 6 ? key : key.slice(0, 6) + '…'}`
    }

    #loadState () {
      const state = this.storage.getItem(this.storageKey)
      return state ? JSON.parse(state) : { started: false }
    }

    #saveState () {
      this.storage.setItem(this.storageKey, JSON.stringify(this.state))
    }

    #updateState (state) {
      if (state.started !== undefined || this.state.started) {
        Object.assign(this.state, state)
        this.#saveState()
        this.#onupdate()
      }
    }

    #onupdate () {
      this.shadowRoot.querySelector('#checklist').innerHTML = this.#renderChecklist()
      this.#updateButton()
      this.#attachEventListeners()
    }

    #renderChecklist () {
      return this.items
        .map((item, index) => `
          <div class="list-item ${!this.state.started ? 'inactive' : ''}">
            <input type="checkbox" id="item-${index}" ${this.state[item.id] ? 'checked' : ''} class="check-item" ${!this.state.started ? 'disabled' : ''}>
            <label for="item-${index}" class="${this.state.started ? '' : 'disabled-label'} label">${item.text}</label>
            <info-tooltip info-text="${item.tooltip}"></info-tooltip>
          </div>
        `).join('')
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
    }

    #resetChecks () {
      const state = { started: false }
      for (const item of this.items) {
        state[item.id] = false
      }
      this.#updateState(state)
    }

    #startChecks () {
      this.#updateState({ started: true })
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

            input[type="checkbox"] {
              appearance: none;
              -webkit-appearance: none;
              -moz-appearance: none;
              display: inline-block;
              width: 24px;
              height: 24px;
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
          </style>
          <div class="list-container">
            <h1 class="green">Pear Doctor</h1>
            <start-button started="${this.state.started}"></start-button>
            <div id="checklist">
              ${this.#renderChecklist()}
            </div>
          </div>
          <side-panel></side-panel>
        </div>
      `
      this.#attachEventListeners()
    }
  }
)
