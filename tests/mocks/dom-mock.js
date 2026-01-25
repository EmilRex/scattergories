/**
 * DOM and Browser API mocks for testing
 */

/**
 * Create a fresh localStorage mock
 */
export function createMockLocalStorage() {
  return {
    _data: {},
    getItem(key) {
      return this._data[key] ?? null;
    },
    setItem(key, value) {
      this._data[key] = String(value);
    },
    removeItem(key) {
      delete this._data[key];
    },
    clear() {
      this._data = {};
    },
    get length() {
      return Object.keys(this._data).length;
    },
    key(index) {
      return Object.keys(this._data)[index] ?? null;
    }
  };
}

/**
 * Create a mock window.location object
 */
export function createMockLocation(initialUrl = 'http://localhost:3000') {
  const url = new URL(initialUrl);

  return {
    href: url.href,
    origin: url.origin,
    protocol: url.protocol,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,

    assign(newUrl) {
      Object.assign(this, createMockLocation(newUrl));
    },

    replace(newUrl) {
      Object.assign(this, createMockLocation(newUrl));
    },

    reload() {
      // No-op in tests
    }
  };
}

/**
 * Create a mock window.history object
 */
export function createMockHistory() {
  const states = [{ state: null, title: '', url: '' }];
  let currentIndex = 0;

  return {
    get length() {
      return states.length;
    },

    get state() {
      return states[currentIndex]?.state ?? null;
    },

    pushState(state, title, url) {
      states.splice(currentIndex + 1);
      states.push({ state, title, url });
      currentIndex = states.length - 1;
    },

    replaceState(state, title, url) {
      states[currentIndex] = { state, title, url };
    },

    go(delta) {
      const newIndex = currentIndex + delta;
      if (newIndex >= 0 && newIndex < states.length) {
        currentIndex = newIndex;
      }
    },

    back() {
      this.go(-1);
    },

    forward() {
      this.go(1);
    }
  };
}

/**
 * Create a mock Element
 */
export function createMockElement(tagName = 'div') {
  const element = {
    tagName: tagName.toUpperCase(),
    className: '',
    id: '',
    textContent: '',
    innerHTML: '',
    innerText: '',
    style: {},
    dataset: {},
    children: [],
    parentNode: null,

    _attributes: {},
    _eventListeners: {},

    getAttribute(name) {
      return this._attributes[name] ?? null;
    },

    setAttribute(name, value) {
      this._attributes[name] = String(value);
    },

    removeAttribute(name) {
      delete this._attributes[name];
    },

    hasAttribute(name) {
      return name in this._attributes;
    },

    addEventListener(type, handler, options) {
      if (!this._eventListeners[type]) {
        this._eventListeners[type] = [];
      }
      this._eventListeners[type].push({ handler, options });
    },

    removeEventListener(type, handler) {
      if (this._eventListeners[type]) {
        this._eventListeners[type] = this._eventListeners[type].filter(
          l => l.handler !== handler
        );
      }
    },

    dispatchEvent(event) {
      const type = event.type || event;
      if (this._eventListeners[type]) {
        this._eventListeners[type].forEach(l => l.handler(event));
      }
      return true;
    },

    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },

    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index > -1) {
        this.children.splice(index, 1);
        child.parentNode = null;
      }
      return child;
    },

    querySelector(selector) {
      return null;
    },

    querySelectorAll(selector) {
      return [];
    },

    focus() {},
    blur() {},
    click() {
      this.dispatchEvent({ type: 'click' });
    }
  };

  return element;
}

/**
 * Create a mock document
 */
export function createMockDocument() {
  const elements = new Map();
  const body = createMockElement('body');

  return {
    body,

    getElementById(id) {
      return elements.get(id) || null;
    },

    querySelector(selector) {
      return null;
    },

    querySelectorAll(selector) {
      return [];
    },

    createElement(tagName) {
      return createMockElement(tagName);
    },

    createTextNode(text) {
      return { nodeType: 3, textContent: text };
    },

    // Test helper: register an element by ID
    _registerElement(id, element) {
      element.id = id;
      elements.set(id, element);
    },

    _clearElements() {
      elements.clear();
    }
  };
}

export default {
  createMockLocalStorage,
  createMockLocation,
  createMockHistory,
  createMockElement,
  createMockDocument
};
