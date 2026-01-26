/**
 * Tests for peer-manager.js - PeerJS wrapper
 */

/* global MockDataConnection */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("peer-manager", () => {
  let PeerManager;
  let peerManager;
  let store;

  beforeEach(async () => {
    vi.resetModules();

    // Import fresh store and peer-manager
    const storeModule = await import("../../js/state/store.js");
    store = storeModule.default;

    // Reset store state
    store.set("peerId", null);
    store.set("isConnected", false);

    // Create fresh PeerManager instance
    const module = await import("../../js/network/peer-manager.js");
    PeerManager = module.peerManager.constructor;
    peerManager = new PeerManager();
  });

  afterEach(() => {
    if (peerManager && peerManager.peer && !peerManager.peer.destroyed) {
      peerManager.destroy();
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("initialize", () => {
    it("creates a peer with auto-generated ID", async () => {
      const id = await peerManager.initialize();
      expect(id).toBeDefined();
      expect(peerManager.peer).not.toBeNull();
      // Mock Peer generates IDs like "mock-peer-xxxxx"
      expect(peerManager.peer.id).toBeDefined();
    });

    it("creates a peer with custom ID when provided", async () => {
      const customId = "CUSTOM01";
      const id = await peerManager.initialize(customId);
      expect(id).toBe(customId);
    });

    it("sets isConnected to true in store after connection", async () => {
      await peerManager.initialize();
      expect(store.get("isConnected")).toBe(true);
    });

    it("sets peerId in store after connection", async () => {
      await peerManager.initialize("MYID01");
      expect(store.get("peerId")).toBe("MYID01");
    });

    it("destroys existing peer before creating new one", async () => {
      await peerManager.initialize("FIRST1");
      const firstPeer = peerManager.peer;

      await peerManager.initialize("SECOND");
      expect(firstPeer.destroyed).toBe(true);
    });

    it("resets reconnect attempts on successful connection", async () => {
      peerManager.reconnectAttempts = 3;
      await peerManager.initialize();
      expect(peerManager.reconnectAttempts).toBe(0);
    });
  });

  describe("connectTo", () => {
    beforeEach(async () => {
      await peerManager.initialize();
    });

    it("creates connection to host", async () => {
      const conn = await peerManager.connectTo("HOST01");
      expect(conn).toBeDefined();
      expect(conn.peer).toBe("HOST01");
    });

    it("stores connection in connections map", async () => {
      await peerManager.connectTo("HOST02");
      expect(peerManager.connections.has("HOST02")).toBe(true);
    });

    it("rejects when peer not initialized", async () => {
      peerManager.peer = null;
      await expect(peerManager.connectTo("HOST03")).rejects.toThrow("Peer not initialized");
    });

    it("sets connection to open after connecting", async () => {
      const conn = await peerManager.connectTo("HOST04");
      expect(conn.open).toBe(true);
    });
  });

  describe("handleIncomingConnection", () => {
    beforeEach(async () => {
      await peerManager.initialize("HOST99");
    });

    it("stores incoming connection after open event", () => {
      const mockConn = new MockDataConnection("CLIENT1", "HOST99");

      peerManager.handleIncomingConnection(mockConn);
      mockConn._emit("open");

      expect(peerManager.connections.has("CLIENT1")).toBe(true);
    });

    it("emits connection event when client connects", () => {
      const mockConn = new MockDataConnection("CLIENT2", "HOST99");
      const connectionHandler = vi.fn();

      peerManager.on("connection", connectionHandler);
      peerManager.handleIncomingConnection(mockConn);
      mockConn._emit("open");

      expect(connectionHandler).toHaveBeenCalledWith(
        expect.objectContaining({ peerId: "CLIENT2" })
      );
    });
  });

  describe("send", () => {
    beforeEach(async () => {
      await peerManager.initialize("SENDER1");
    });

    it("sends message to connected peer", async () => {
      const conn = await peerManager.connectTo("RECEIVER");
      const message = { type: "TEST", data: "hello" };

      const result = peerManager.send("RECEIVER", message);

      expect(result).toBe(true);
      expect(conn._sentMessages).toContainEqual(message);
    });

    it("returns false for unknown peer", () => {
      const result = peerManager.send("UNKNOWN", { type: "TEST" });
      expect(result).toBe(false);
    });

    it("returns false for closed connection", async () => {
      const conn = await peerManager.connectTo("CLOSED");
      conn.open = false;

      const result = peerManager.send("CLOSED", { type: "TEST" });
      expect(result).toBe(false);
    });
  });

  describe("broadcast", () => {
    beforeEach(async () => {
      await peerManager.initialize("BROADCASTER");
    });

    it("sends message to all connected peers", async () => {
      const conn1 = await peerManager.connectTo("PEER1");
      const conn2 = await peerManager.connectTo("PEER2");
      const message = { type: "BROADCAST", data: "all" };

      peerManager.broadcast(message);

      expect(conn1._sentMessages).toContainEqual(message);
      expect(conn2._sentMessages).toContainEqual(message);
    });

    it("excludes specified peer from broadcast", async () => {
      const conn1 = await peerManager.connectTo("PEER1");
      const conn2 = await peerManager.connectTo("PEER2");
      const message = { type: "BROADCAST", data: "excluding" };

      peerManager.broadcast(message, "PEER1");

      expect(conn1._sentMessages).not.toContainEqual(message);
      expect(conn2._sentMessages).toContainEqual(message);
    });

    it("skips closed connections", async () => {
      const conn1 = await peerManager.connectTo("PEER1");
      const conn2 = await peerManager.connectTo("PEER2");
      conn1.open = false;
      const message = { type: "BROADCAST" };

      peerManager.broadcast(message);

      expect(conn1._sentMessages).not.toContainEqual(message);
      expect(conn2._sentMessages).toContainEqual(message);
    });
  });

  describe("on/off handlers", () => {
    it("registers message handler", () => {
      const handler = vi.fn();
      peerManager.on("TEST_TYPE", handler);

      expect(peerManager.messageHandlers.has("TEST_TYPE")).toBe(true);
      expect(peerManager.messageHandlers.get("TEST_TYPE").has(handler)).toBe(true);
    });

    it("unregisters message handler", () => {
      const handler = vi.fn();
      peerManager.on("TEST_TYPE", handler);
      peerManager.off("TEST_TYPE", handler);

      expect(peerManager.messageHandlers.get("TEST_TYPE").has(handler)).toBe(false);
    });

    it("allows multiple handlers for same type", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      peerManager.on("MULTI", handler1);
      peerManager.on("MULTI", handler2);

      expect(peerManager.messageHandlers.get("MULTI").size).toBe(2);
    });

    it("handles off for non-existent type gracefully", () => {
      const handler = vi.fn();
      expect(() => peerManager.off("NONEXISTENT", handler)).not.toThrow();
    });
  });

  describe("handleMessage", () => {
    it("calls registered handler with message data", () => {
      const handler = vi.fn();
      peerManager.on("MSG_TYPE", handler);

      peerManager.handleMessage("sender1", { type: "MSG_TYPE", payload: "test" });

      expect(handler).toHaveBeenCalledWith({ type: "MSG_TYPE", payload: "test" }, "sender1");
    });

    it("ignores messages without type", () => {
      const handler = vi.fn();
      peerManager.on("ANY", handler);

      peerManager.handleMessage("sender", { noType: true });
      peerManager.handleMessage("sender", null);

      expect(handler).not.toHaveBeenCalled();
    });

    it("emits general message event", () => {
      const messageHandler = vi.fn();
      peerManager.on("message", messageHandler);

      peerManager.handleMessage("peer1", { type: "SOME_MSG", data: "value" });

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "SOME_MSG",
          fromPeerId: "peer1",
        })
      );
    });

    it("calls multiple handlers for same message type", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      peerManager.on("DUAL", handler1);
      peerManager.on("DUAL", handler2);
      peerManager.handleMessage("sender", { type: "DUAL" });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe("handleDisconnect", () => {
    it("increments reconnect attempts", async () => {
      await peerManager.initialize();
      expect(peerManager.reconnectAttempts).toBe(0);

      peerManager.handleDisconnect();

      expect(peerManager.reconnectAttempts).toBe(1);
    });

    it("emits maxReconnectAttempts when limit reached", async () => {
      await peerManager.initialize();
      const maxHandler = vi.fn();
      peerManager.on("maxReconnectAttempts", maxHandler);
      peerManager.reconnectAttempts = 3; // TIMING.RECONNECT_ATTEMPTS is 3

      peerManager.handleDisconnect();

      expect(maxHandler).toHaveBeenCalled();
    });

    it("does not increment attempts when max reached", async () => {
      await peerManager.initialize();
      peerManager.reconnectAttempts = 3;

      peerManager.handleDisconnect();

      expect(peerManager.reconnectAttempts).toBe(3);
    });
  });

  describe("getConnectedPeers", () => {
    beforeEach(async () => {
      await peerManager.initialize();
    });

    it("returns empty array when no connections", () => {
      expect(peerManager.getConnectedPeers()).toEqual([]);
    });

    it("returns array of connected peer IDs", async () => {
      await peerManager.connectTo("A");
      await peerManager.connectTo("B");

      const peers = peerManager.getConnectedPeers();
      expect(peers).toContain("A");
      expect(peers).toContain("B");
      expect(peers).toHaveLength(2);
    });
  });

  describe("isConnectedTo", () => {
    beforeEach(async () => {
      await peerManager.initialize();
    });

    it("returns true for open connection", async () => {
      await peerManager.connectTo("OPEN1");
      expect(peerManager.isConnectedTo("OPEN1")).toBe(true);
    });

    it("returns falsy for unknown peer", () => {
      expect(peerManager.isConnectedTo("UNKNOWN")).toBeFalsy();
    });

    it("returns false for closed connection", async () => {
      const conn = await peerManager.connectTo("CLOSED1");
      conn.open = false;
      expect(peerManager.isConnectedTo("CLOSED1")).toBe(false);
    });
  });

  describe("getPeerId", () => {
    it("returns null when peer not initialized", () => {
      expect(peerManager.getPeerId()).toBeNull();
    });

    it("returns peer ID when initialized", async () => {
      await peerManager.initialize("MYID99");
      expect(peerManager.getPeerId()).toBe("MYID99");
    });
  });

  describe("destroy", () => {
    beforeEach(async () => {
      await peerManager.initialize();
    });

    it("closes all connections", async () => {
      const conn1 = await peerManager.connectTo("P1");
      const conn2 = await peerManager.connectTo("P2");

      peerManager.destroy();

      expect(conn1.open).toBe(false);
      expect(conn2.open).toBe(false);
    });

    it("clears connections map", async () => {
      await peerManager.connectTo("P1");
      peerManager.destroy();

      expect(peerManager.connections.size).toBe(0);
    });

    it("destroys peer instance", () => {
      const peer = peerManager.peer;
      peerManager.destroy();

      expect(peer.destroyed).toBe(true);
      expect(peerManager.peer).toBeNull();
    });

    it("resets store state", () => {
      store.set("peerId", "TEST");
      store.set("isConnected", true);

      peerManager.destroy();

      expect(store.get("peerId")).toBeNull();
      expect(store.get("isConnected")).toBe(false);
    });
  });

  describe("emit", () => {
    it("calls all handlers for event type", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      peerManager.on("custom", handler1);
      peerManager.on("custom", handler2);
      peerManager.emit("custom", { foo: "bar" });

      expect(handler1).toHaveBeenCalledWith({ foo: "bar" });
      expect(handler2).toHaveBeenCalledWith({ foo: "bar" });
    });

    it("does nothing for unregistered event type", () => {
      expect(() => peerManager.emit("unregistered", {})).not.toThrow();
    });
  });

  describe("setupConnectionHandlers", () => {
    beforeEach(async () => {
      await peerManager.initialize();
    });

    it("routes messages through handleMessage", async () => {
      const conn = await peerManager.connectTo("PEER1");
      const handler = vi.fn();
      peerManager.on("TEST_MSG", handler);

      // Simulate receiving data
      conn._handlers["data"]?.forEach((h) => h({ type: "TEST_MSG", value: 123 }));

      expect(handler).toHaveBeenCalledWith({ type: "TEST_MSG", value: 123 }, "PEER1");
    });

    it("emits disconnection event on connection close", async () => {
      const conn = await peerManager.connectTo("PEER2");
      const disconnectHandler = vi.fn();
      peerManager.on("disconnection", disconnectHandler);

      // Simulate connection close
      conn.close();

      expect(disconnectHandler).toHaveBeenCalledWith({ peerId: "PEER2" });
    });

    it("removes connection from map on close", async () => {
      const conn = await peerManager.connectTo("PEER3");
      expect(peerManager.connections.has("PEER3")).toBe(true);

      conn.close();

      expect(peerManager.connections.has("PEER3")).toBe(false);
    });
  });
});
