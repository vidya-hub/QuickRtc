/**
 * QuickRTC Types Library
 *
 * Shared TypeScript definitions for QuickRTC client and server applications.
 * This library provides type-safe interfaces for MediaSoup WebRTC communications,
 * socket events, and application state management.
 */

// Core types and interfaces
export * from "./core";

// Conference management types
export * from "./conference";

// Transport and media types
export * from "./transport";

// Socket communication types
export * from "./socket_server";

// Client-specific types
export * from "./client";

// Utility types
export * from "./utils";

export * from "./socket_client";

// Note: MediaSoup and Socket.IO types should be imported directly from their respective packages
// This avoids module resolution issues and keeps the types library focused on application-specific types

/**
 * Version of the types library
 */
export const TYPES_VERSION = "1.0.0";

/**
 * Supported MediaSoup version range
 */
export const MEDIASOUP_VERSION_RANGE = "^3.19.0";

/**
 * Supported Socket.IO version range
 */
export const SOCKETIO_VERSION_RANGE = "^4.8.0";
