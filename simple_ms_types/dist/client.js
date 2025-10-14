"use strict";
/**
 * Client-specific types and interfaces
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientConnectionState = void 0;
/**
 * Client connection state
 */
var ClientConnectionState;
(function (ClientConnectionState) {
    ClientConnectionState["DISCONNECTED"] = "disconnected";
    ClientConnectionState["CONNECTING"] = "connecting";
    ClientConnectionState["CONNECTED"] = "connected";
    ClientConnectionState["RECONNECTING"] = "reconnecting";
    ClientConnectionState["ERROR"] = "error";
})(ClientConnectionState || (exports.ClientConnectionState = ClientConnectionState = {}));
