/* global Pear */
/* eslint-env browser */
customElements.define('app-router', class AppRouter extends HTMLElement {
  constructor () {
    super()
    this.routes = {}
    this.page = null
    this.anchor = null
  }

  unload () {
    for (const element of Object.values(this.routes)) element?.unload && element.unload()
  }

  async load (pathname = '/', opts = {}) {
    if (this.page === pathname && this.anchor === opts.anchor) return
    this.page = pathname
    this.anchor = opts.anchor
    for (const [route, element] of Object.entries(this.routes)) {
      if (pathname.startsWith(route)) {
        const page = pathname.slice(route.length) || '/'
        this.unload()
        document.documentElement.scrollTop = 0
        this.dataset.load = element.tagName.toLowerCase()
        await element.load(page, opts)

        if (!opts.back) history.pushState({ pathname, anchor: opts.anchor }, null, pathname)
        break
      }
    }
  }

  link (evt) {
    if (evt.target?.tagName !== 'A') return
    evt.preventDefault()
    if (evt.target.origin !== location.origin) return window.open(evt.target.href)
    const { tagName } = evt.target.getRootNode().host || {}
    const route = tagName ? this.getAttribute(tagName) : ''
    if (evt.target.pathname.startsWith(route)) {
      const anchor = evt.target.href.split('#')[1]
      this.load(evt.target.pathname, { anchor }).catch(console.error)
    } else {
      this.load(route + evt.target.pathname).catch(console.error)
    }
  }

  connectedCallback () {
    for (const { name, value } of Array.from(this.attributes)) {
      if (name.startsWith('data-')) continue
      this.routes[value] = this.querySelector(name)
      this.routes[value].router = this
    }

    this.addEventListener('click', (evt) => this.link(evt))

    window.addEventListener('popstate', (evt) => {
      this.load(evt.state?.pathname, { back: true, anchor: evt.state?.anchor }).catch(console.error)
    })

    window.addEventListener('load', () => {
      const page = '/' + (Pear.config.linkData || '')
      this.load(page).catch(console.error)
      Pear.wakeups(({ data }) => {
        Pear.Window.self.focus({ steal: true }).catch(console.error)
        const page = '/' + (data || '')
        this.load(page).catch(console.error)
      })
    })
  }
})
