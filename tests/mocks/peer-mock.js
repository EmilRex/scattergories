/**
 * PeerJS Mock for testing network layer
 */

/**
 * Create a mock PeerManager for testing
 */
export function createMockPeerManager() {
  return {
    peer: null,
    connections: new Map(),
    messageHandlers: new Map(),
    _sentMessages: [],
    _broadcasts: [],

    async initialize(customId = null) {
      const id = customId || "mock-" + Math.random().toString(36).slice(2, 8);
      this.peer = { id, destroyed: false };
      return id;
    },

    async connectTo(hostId) {
      const conn = createMockConnection(hostId, this.peer?.id);
      this.connections.set(hostId, conn);
      conn.open = true;
      return conn;
    },

    on(type, handler) {
      if (!this.messageHandlers.has(type)) {
        this.messageHandlers.set(type, new Set());
      }
      this.messageHandlers.get(type).add(handler);
    },

    off(type, handler) {
      if (this.messageHandlers.has(type)) {
        this.messageHandlers.get(type).delete(handler);
      }
    },

    emit(type, data) {
      if (this.messageHandlers.has(type)) {
        for (const handler of this.messageHandlers.get(type)) {
          handler(data);
        }
      }
    },

    send(peerId, message) {
      this._sentMessages.push({ peerId, message });
      return true;
    },

    broadcast(message, excludePeerId = null) {
      this._broadcasts.push({ message, excludePeerId });
    },

    getPeerId() {
      return this.peer?.id;
    },

    getConnectedPeers() {
      return Array.from(this.connections.keys());
    },

    isConnectedTo(peerId) {
      const conn = this.connections.get(peerId);
      return conn && conn.open;
    },

    destroy() {
      this.connections.clear();
      this.peer = null;
    },

    // Test helpers
    simulateMessage(fromPeerId, data) {
      const type = data.type;
      if (this.messageHandlers.has(type)) {
        for (const handler of this.messageHandlers.get(type)) {
          handler(data, fromPeerId);
        }
      }
    },

    simulateConnection(peerId) {
      const conn = createMockConnection(peerId, this.peer?.id);
      this.connections.set(peerId, conn);
      conn.open = true;
      this.emit("connection", { peerId, conn });
      return conn;
    },

    simulateDisconnection(peerId) {
      this.connections.delete(peerId);
      this.emit("disconnection", { peerId });
    },

    clearTestData() {
      this._sentMessages = [];
      this._broadcasts = [];
    },
  };
}

/**
 * Create a mock DataConnection
 */
export function createMockConnection(peerId, localId) {
  return {
    peer: peerId,
    localId: localId,
    open: false,
    reliable: true,
    _handlers: {},
    _sentMessages: [],

    on(event, handler) {
      if (!this._handlers[event]) {
        this._handlers[event] = [];
      }
      this._handlers[event].push(handler);
    },

    send(data) {
      this._sentMessages.push(data);
    },

    close() {
      this.open = false;
      if (this._handlers["close"]) {
        this._handlers["close"].forEach((h) => h());
      }
    },
  };
}

/**
 * Create a pair of connected mock peers for integration testing
 */
export function createConnectedPeerPair() {
  const hostPeer = createMockPeerManager();
  const clientPeer = createMockPeerManager();

  const hostId = "TEST01";
  const clientId = "client-123";

  hostPeer.peer = { id: hostId, destroyed: false };
  clientPeer.peer = { id: clientId, destroyed: false };

  // Create bidirectional connection
  const hostToClient = createMockConnection(clientId, hostId);
  const clientToHost = createMockConnection(hostId, clientId);

  hostToClient.open = true;
  clientToHost.open = true;

  hostPeer.connections.set(clientId, hostToClient);
  clientPeer.connections.set(hostId, clientToHost);

  // Wire up message routing
  const originalHostSend = hostPeer.send.bind(hostPeer);
  hostPeer.send = (peerId, message) => {
    originalHostSend(peerId, message);
    // Route message to client
    if (peerId === clientId) {
      clientPeer.simulateMessage(hostId, message);
    }
  };

  const originalClientSend = clientPeer.send.bind(clientPeer);
  clientPeer.send = (peerId, message) => {
    originalClientSend(peerId, message);
    // Route message to host
    if (peerId === hostId) {
      hostPeer.simulateMessage(clientId, message);
    }
  };

  // Wire up broadcasts
  const originalBroadcast = hostPeer.broadcast.bind(hostPeer);
  hostPeer.broadcast = (message, excludePeerId) => {
    originalBroadcast(message, excludePeerId);
    // Route to all connected clients
    for (const [peerId] of hostPeer.connections) {
      if (peerId !== excludePeerId) {
        clientPeer.simulateMessage(hostId, message);
      }
    }
  };

  return { hostPeer, clientPeer, hostId, clientId };
}

export default {
  createMockPeerManager,
  createMockConnection,
  createConnectedPeerPair,
};
