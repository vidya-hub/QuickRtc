"use strict";
/**
 * Simple MediaSoup Types Library
 *
 * Shared TypeScript definitions for Simple MediaSoup client and server applications.
 * This library provides type-safe interfaces for MediaSoup WebRTC communications,
 * socket events, and application state management.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKETIO_VERSION_RANGE = exports.MEDIASOUP_VERSION_RANGE = exports.TYPES_VERSION = void 0;
// Core types and interfaces
__exportStar(require("./core"), exports);
// Conference management types
__exportStar(require("./conference"), exports);
// Transport and media types
__exportStar(require("./transport"), exports);
// Socket communication types
__exportStar(require("./socket_server"), exports);
// Client-specific types
__exportStar(require("./client"), exports);
// Utility types
__exportStar(require("./utils"), exports);
__exportStar(require("./socket_client"), exports);
// Note: MediaSoup and Socket.IO types should be imported directly from their respective packages
// This avoids module resolution issues and keeps the types library focused on application-specific types
/**
 * Version of the types library
 */
exports.TYPES_VERSION = "1.0.0";
/**
 * Supported MediaSoup version range
 */
exports.MEDIASOUP_VERSION_RANGE = "^3.19.0";
/**
 * Supported Socket.IO version range
 */
exports.SOCKETIO_VERSION_RANGE = "^4.8.0";
