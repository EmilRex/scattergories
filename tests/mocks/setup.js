/**
 * Global test setup
 */

// Mock console.log/warn in tests to reduce noise
// Comment these out when debugging
// global.console.log = vi.fn();
// global.console.warn = vi.fn();

// Mock window object for browser-like environment
global.window = {
  location: {
    href: "http://localhost:3000",
    origin: "http://localhost:3000",
    pathname: "/",
    search: "",
    hash: "",
  },
  history: {
    pushState: () => {},
    replaceState: () => {},
  },
};

// Mock localStorage
global.localStorage = {
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
};

// Mock document for minimal DOM operations
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    className: "",
    textContent: "",
    innerHTML: "",
    style: {},
    appendChild: () => {},
    removeChild: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
};

// Mock Peer class (PeerJS)
global.Peer = class MockPeer {
  constructor(id, options) {
    this.id = id || "mock-peer-" + Math.random().toString(36).slice(2, 8);
    this.options = options;
    this.destroyed = false;
    this._handlers = {};
    this._connections = new Map();

    // Auto-trigger open event on next tick
    setTimeout(() => {
      this._emit("open", this.id);
    }, 0);
  }

  on(event, handler) {
    if (!this._handlers[event]) {
      this._handlers[event] = [];
    }
    this._handlers[event].push(handler);
  }

  off(event, handler) {
    if (this._handlers[event]) {
      this._handlers[event] = this._handlers[event].filter((h) => h !== handler);
    }
  }

  _emit(event, data) {
    if (this._handlers[event]) {
      this._handlers[event].forEach((h) => h(data));
    }
  }

  connect(peerId, _options) {
    const conn = new MockDataConnection(peerId, this.id);
    this._connections.set(peerId, conn);

    // Auto-open connection
    setTimeout(() => {
      conn._emit("open");
    }, 0);

    return conn;
  }

  reconnect() {
    setTimeout(() => {
      this._emit("open", this.id);
    }, 0);
  }

  destroy() {
    this.destroyed = true;
    this._connections.forEach((conn) => conn.close());
    this._connections.clear();
  }
};

// Mock DataConnection (PeerJS)
class MockDataConnection {
  constructor(peerId, localId) {
    this.peer = peerId;
    this.localId = localId;
    this.open = false;
    this.reliable = true;
    this._handlers = {};
    this._sentMessages = [];
  }

  on(event, handler) {
    if (!this._handlers[event]) {
      this._handlers[event] = [];
    }
    this._handlers[event].push(handler);
  }

  off(event, handler) {
    if (this._handlers[event]) {
      this._handlers[event] = this._handlers[event].filter((h) => h !== handler);
    }
  }

  _emit(event, data) {
    if (event === "open") {
      this.open = true;
    }
    if (this._handlers[event]) {
      this._handlers[event].forEach((h) => h(data));
    }
  }

  send(data) {
    if (!this.open) {
      throw new Error("Connection not open");
    }
    this._sentMessages.push(data);
  }

  close() {
    this.open = false;
    this._emit("close");
  }
}

global.MockDataConnection = MockDataConnection;
