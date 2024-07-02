/* global Pear */
/* eslint-env browser */

const ITEM_COLD_START = 1
const ITEM_WAKE_UP = 2

customElements.define(
  'doctor-checklist',
  class extends HTMLElement {
    router = null

    connectedCallback () {
      this.root.addEventListener('click', (evt) => {
        this.router.link(evt)
      })
    }

    load () {
      this.style.display = ''
    }

    unload () {
      this.style.display = 'none'
    }

    constructor () {
      super()
      this.root = this.attachShadow({ mode: 'open' })
      this.storage = global.localStorage
      this.storageKey = 'state'
      this.items = [
        { id: ITEM_COLD_START, text: 'Cold-start link click - link opens app' },
        { id: ITEM_WAKE_UP, text: 'Wake-up link click - link click while app is open' }
      ]
      this.state = this.#loadState()

      this.#render()
      this.#attachEventListeners()

      if (Pear.config.linkData !== null) {
        this.#updateState({ [ITEM_COLD_START]: true })
      }

      Pear.wakeups(() => {
        this.#updateState({ [ITEM_WAKE_UP]: true })
      })
    }

    #loadState () {
      const state = this.storage.getItem(this.storageKey)
      return state ? JSON.parse(state) : {}
    }

    #saveState () {
      this.storage.setItem(this.storageKey, JSON.stringify(this.state))
    }

    #updateState (state) {
      Object.assign(this.state, state)
      this.#saveState()
      this.#onupdate()
    }

    #onupdate () {
      this.shadowRoot.querySelector('#checklist').innerHTML = `
        ${this.#renderChecklist()}
        <button id="reset-button">Reset Checks</button>
      `
      this.#attachEventListeners()
    }

    #renderChecklist () {
      return this.items
        .map((item, index) => `
        <div class="list-item">
          <input type="checkbox" id="item-${index}" ${this.state[item.id] ? 'checked' : ''} class="check-item">
          <label for="item-${index}">${item.text}</label>
        </div>
      `)
        .join('')
    }

    #attachEventListeners () {
      const resetButton = this.shadowRoot.querySelector('#reset-button')
      resetButton.addEventListener('click', (event) => {
        event.preventDefault()
        this.#resetChecks()
      })
    }

    #resetChecks () {
      this.state = {}
      this.#saveState()
      this.#onupdate()
    }

    #render () {
      this.shadowRoot.innerHTML = `
    <div id="panel">
      <style>
        #panel { user-select: none; }
        h1 {
          padding: 0.5rem;
          display: inline-block;
          padding-right: 0.75em;
          font-weight: bold;
          font-size: 2.46rem;
          margin-left: -0.7rem;
          margin-top: 1rem;
          margin-bottom: 1.25rem;
        }
        .list-item {
          margin: 10px 0;
        }
        .check-item {
          pointer-events: none;
        }
        .check-item:disabled {
          opacity: 1;
        }
        #reset-button {
          margin-top: 20px;
        }
      </style>
      <h1>Doctor</h1>
      <div id="checklist">
        ${this.#renderChecklist()}
        <button id="reset-button">Reset Checks</button>
      </div>
    </div>
    `
    }
  }
)
