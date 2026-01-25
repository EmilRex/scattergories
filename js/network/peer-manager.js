/**
 * PeerJS Wrapper - Handles WebRTC peer lifecycle
 */

import { PEER_CONFIG, TIMING } from "../config.js";
import store from "../state/store.js";

class PeerManager {
  constructor() {
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
  }

  /**
   * Initialize PeerJS with optional custom ID
   * @param {string} customId - Optional peer ID (used for hosting)
   * @returns {Promise<string>} Resolved peer ID
   */
  async initialize(customId = null) {
    return new Promise((resolve, reject) => {
      // Clean up existing peer if any
      if (this.peer) {
        this.destroy();
      }

      const peerOptions = { ...PEER_CONFIG };

      // Create peer with custom ID or let PeerJS generate one
      this.peer = customId ? new Peer(customId, peerOptions) : new Peer(peerOptions);

      this.peer.on("open", (id) => {
        console.log("Peer connected with ID:", id);
        store.set("peerId", id);
        store.set("isConnected", true);
        this.reconnectAttempts = 0;
        resolve(id);
      });

      this.peer.on("error", (err) => {
        console.error("Peer error:", err);
        store.set("isConnected", false);

        if (err.type === "unavailable-id") {
          reject(new Error("Game ID already in use"));
        } else if (err.type === "peer-unavailable") {
          reject(new Error("Game not found"));
        } else if (err.type === "disconnected" || err.type === "network") {
          this.handleDisconnect();
        } else {
          reject(err);
        }
      });

      this.peer.on("disconnected", () => {
        console.log("Peer disconnected from server");
        store.set("isConnected", false);
        this.handleDisconnect();
      });

      this.peer.on("close", () => {
        console.log("Peer connection closed");
        store.set("isConnected", false);
      });

      // Handle incoming connections (host receives these)
      this.peer.on("connection", (conn) => {
        this.handleIncomingConnection(conn);
      });
    });
  }

  /**
   * Connect to a remote peer (client connecting to host)
   * @param {string} hostId - Host's peer ID
   * @returns {Promise<DataConnection>}
   */
  async connectTo(hostId) {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error("Peer not initialized"));
        return;
      }

      const conn = this.peer.connect(hostId, {
        reliable: true,
      });

      conn.on("open", () => {
        console.log("Connected to host:", hostId);
        this.connections.set(hostId, conn);
        this.setupConnectionHandlers(conn);
        resolve(conn);
      });

      conn.on("error", (err) => {
        console.error("Connection error:", err);
        reject(err);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!conn.open) {
          reject(new Error("Connection timeout"));
        }
      }, 10000);
    });
  }

  /**
   * Handle incoming connection from a client
   */
  handleIncomingConnection(conn) {
    console.log("Incoming connection from:", conn.peer);

    conn.on("open", () => {
      this.connections.set(conn.peer, conn);
      this.setupConnectionHandlers(conn);

      // Notify message handlers
      this.emit("connection", { peerId: conn.peer, conn });
    });
  }

  /**
   * Set up message handlers for a connection
   */
  setupConnectionHandlers(conn) {
    conn.on("data", (data) => {
      this.handleMessage(conn.peer, data);
    });

    conn.on("close", () => {
      console.log("Connection closed:", conn.peer);
      this.connections.delete(conn.peer);
      this.emit("disconnection", { peerId: conn.peer });
    });

    conn.on("error", (err) => {
      console.error("Connection error with", conn.peer, ":", err);
    });
  }

  /**
   * Handle incoming message
   */
  handleMessage(fromPeerId, data) {
    if (!data || !data.type) {
      console.warn("Received invalid message:", data);
      return;
    }

    console.log(`Message from ${fromPeerId}:`, data.type);

    // Call registered handlers for this message type
    if (this.messageHandlers.has(data.type)) {
      for (const handler of this.messageHandlers.get(data.type)) {
        handler(data, fromPeerId);
      }
    }

    // Also emit as general 'message' event
    this.emit("message", { type: data.type, data, fromPeerId });
  }

  /**
   * Send message to a specific peer
   */
  send(peerId, message) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(message);
      return true;
    }
    console.warn("Cannot send to", peerId, "- connection not found or closed");
    return false;
  }

  /**
   * Broadcast message to all connected peers
   */
  broadcast(message, excludePeerId = null) {
    for (const [peerId, conn] of this.connections) {
      if (peerId !== excludePeerId && conn.open) {
        conn.send(message);
      }
    }
  }

  /**
   * Register a message type handler
   */
  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type).add(handler);
  }

  /**
   * Unregister a message type handler
   */
  off(type, handler) {
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type).delete(handler);
    }
  }

  /**
   * Emit an internal event
   */
  emit(type, data) {
    if (this.messageHandlers.has(type)) {
      for (const handler of this.messageHandlers.get(type)) {
        handler(data);
      }
    }
  }

  /**
   * Handle disconnection with reconnect logic
   */
  handleDisconnect() {
    if (this.reconnectAttempts < TIMING.RECONNECT_ATTEMPTS && this.peer && !this.peer.destroyed) {
      this.reconnectAttempts++;
      console.log(`Reconnect attempt ${this.reconnectAttempts}/${TIMING.RECONNECT_ATTEMPTS}`);

      setTimeout(() => {
        if (this.peer && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      }, TIMING.RECONNECT_DELAY);
    } else {
      console.log("Max reconnect attempts reached");
      this.emit("maxReconnectAttempts", {});
    }
  }

  /**
   * Get list of connected peer IDs
   */
  getConnectedPeers() {
    return Array.from(this.connections.keys());
  }

  /**
   * Check if connected to a specific peer
   */
  isConnectedTo(peerId) {
    const conn = this.connections.get(peerId);
    return conn && conn.open;
  }

  /**
   * Get current peer ID
   */
  getPeerId() {
    return this.peer ? this.peer.id : null;
  }

  /**
   * Clean up and destroy peer
   */
  destroy() {
    // Close all connections
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();

    // Destroy peer
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    store.set("peerId", null);
    store.set("isConnected", false);
  }
}

// Singleton instance
export const peerManager = new PeerManager();
export default peerManager;
