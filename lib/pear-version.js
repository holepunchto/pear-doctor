/* global Pear */
/* eslint-env browser, node */

import os from 'os'
const { versions } = Pear

customElements.define('pear-version', class extends HTMLElement {
  constructor () {
    super()
    this.template = document.createElement('template')
    this.template.innerHTML = `
      <style>
        :host > div {
          position: fixed;
          top: 3rem;
          right: 0.5rem;
          font-size: .6rem;
          background: #1a1a1a;
          color: white;
          opacity: 1;
          padding: 0.5rem;
          padding-top: 0;
          padding-bottom: 0;
          border-radius: .35rem;
          border: 0.0625rem solid #3a4816;
          transition: top 0.3s, right 0.3s, opacity 0.3s;
          display: block;
          min-width: 16rem;
          z-index: 3;
          user-select: none;
        }

        .hidden {
          right: -16rem;
        }

        .toggle-button {
          position: absolute;
          top: 0;
          left: 0;
          width: 1.5rem;
          height: 100%;
          background: none;
          color: white;
          cursor: pointer;
          display: none;
          align-items: center;
          justify-content: center;
          border-radius: 0 0.35rem 0.35rem 0;
          user-select: none;
          z-index: 10;
        }

        @media (max-width: 768px) {
          :host > div {
            right: -16rem;
          }

          :host > div.show {
            right: 2rem;
          }

          .toggle-button {
            display: flex;
          }

          .toggle-button.show {
            left: -1.5rem;
          }
        }

        p {
          transition: opacity 0.3s;
        }

        .hidden p {
          opacity: 0;
        }

        .show p {
          opacity: 1;
        }
      </style>
      <div>
        <div class="toggle-button">&#9664;</div>
        <p id="platform-version"></p>
        <p id="app-version"></p>
        <p id="os-version"></p>
        <p id="bare-version"></p>
        <p id="electron-version"></p>
      </div>
    `
    this.root = this.attachShadow({ mode: 'open' })
    this.root.appendChild(this.template.content.cloneNode(true))

    this.toggleButton = this.root.querySelector('.toggle-button')
    this.container = this.root.querySelector(':host > div')

    this.toggleButton.addEventListener('click', () => {
      this.container.classList.toggle('show')
      this.container.classList.toggle('hidden')
      this.updateToggleIcon()
    })

    window.addEventListener('resize', this.handleResize.bind(this))
    this.handleResize()
  }

  connectedCallback () {
    if (!this.osVersion) this.osVersion = `${os.platform()} ${os.arch()} ${os.release()}`

    versions().then(({ app, platform, runtimes }) => {
      this.platformVersion = this.#version(platform)
      this.appVersion = this.#version(app)
      this.bareVersion = runtimes.bare
      this.electronVersion = runtimes.electron || process.versions?.electron
    })
  }

  #version ({ key, length, fork }) { return `${fork}.${length}.${(key += '').length <= 24 ? key : key.slice(0, 24) + '…'}` }

  get platformVersion () { return this.root.querySelector('#platform-version').innerText }
  get appVersion () { return this.root.querySelector('#app-version').innerText }
  get osVersion () { return this.root.querySelector('#os-version').innerText }
  get bareVersion () { return this.root.querySelector('#bare-version').innerText }
  get electronVersion () { return this.root.querySelector('#electron-version').innerText }

  set platformVersion (value) { this.root.querySelector('#platform-version').innerText = `Pear Runtime ${value}` }
  set appVersion (value) { this.root.querySelector('#app-version').innerText = `Pear Doctor ${value}` }
  set osVersion (value) { this.root.querySelector('#os-version').innerText = `OS Platform ${value}` }
  set bareVersion (value) { this.root.querySelector('#bare-version').innerText = `Bare ${value}` }
  set electronVersion (value) { this.root.querySelector('#electron-version').innerText = `Electron ${value}` }

  handleResize () {
    if (window.innerWidth < 768) {
      this.container.classList.remove('show')
      this.container.classList.add('hidden')
    } else {
      this.container.classList.add('show')
      this.container.classList.remove('hidden')
    }
    this.updateToggleIcon()
  }

  updateToggleIcon () {
    if (this.container.classList.contains('show')) {
      this.toggleButton.innerHTML = '&#9654;'
      this.toggleButton.classList.add('show')
    } else {
      this.toggleButton.innerHTML = '&#9664;'
      this.toggleButton.classList.remove('show')
    }
  }
})
