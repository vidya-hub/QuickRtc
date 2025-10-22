"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ErrorHandler = exports.ErrorType = void 0;
const events_1 = require("events");
var ErrorType;
(function (ErrorType) {
    ErrorType["VALIDATION"] = "VALIDATION";
    ErrorType["TRANSPORT"] = "TRANSPORT";
    ErrorType["PRODUCER"] = "PRODUCER";
    ErrorType["CONSUMER"] = "CONSUMER";
    ErrorType["CONFERENCE"] = "CONFERENCE";
    ErrorType["PARTICIPANT"] = "PARTICIPANT";
    ErrorType["WORKER"] = "WORKER";
    ErrorType["NETWORK"] = "NETWORK";
    ErrorType["INTERNAL"] = "INTERNAL";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
class ErrorHandler extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.errors = new Map();
        this.MAX_ERRORS = 1000;
    }
    handleError(type, message, details, participantId, conferenceId, originalError) {
        const error = {
            id: this.generateErrorId(),
            type,
            message,
            details,
            timestamp: Date.now(),
            participantId,
            conferenceId,
            stack: originalError?.stack,
        };
        // Store error for debugging
        this.errors.set(error.id, error);
        this.pruneOldErrors();
        // Emit error event for handling
        this.emit("error", error);
        // Log error
        this.logError(error);
        return error;
    }
    getErrors(type, participantId, conferenceId) {
        let errors = Array.from(this.errors.values());
        if (type) {
            errors = errors.filter((error) => error.type === type);
        }
        if (participantId) {
            errors = errors.filter((error) => error.participantId === participantId);
        }
        if (conferenceId) {
            errors = errors.filter((error) => error.conferenceId === conferenceId);
        }
        return errors.sort((a, b) => b.timestamp - a.timestamp);
    }
    clearErrors(olderThanMs) {
        if (olderThanMs) {
            const cutoffTime = Date.now() - olderThanMs;
            for (const [id, error] of this.errors.entries()) {
                if (error.timestamp < cutoffTime) {
                    this.errors.delete(id);
                }
            }
        }
        else {
            this.errors.clear();
        }
    }
    getErrorStats() {
        const errors = Array.from(this.errors.values());
        const hourAgo = Date.now() - 60 * 60 * 1000;
        const byType = {};
        let recent = 0;
        for (const error of errors) {
            byType[error.type] = (byType[error.type] || 0) + 1;
            if (error.timestamp > hourAgo) {
                recent++;
            }
        }
        return {
            total: errors.length,
            byType,
            recent,
        };
    }
    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    pruneOldErrors() {
        if (this.errors.size > this.MAX_ERRORS) {
            const sortedErrors = Array.from(this.errors.entries()).sort(([, a], [, b]) => a.timestamp - b.timestamp);
            // Remove oldest 10%
            const toRemove = Math.floor(this.MAX_ERRORS * 0.1);
            for (let i = 0; i < toRemove; i++) {
                this.errors.delete(sortedErrors[i][0]);
            }
        }
    }
    logError(error) {
        const logData = {
            id: error.id,
            type: error.type,
            message: error.message,
            participantId: error.participantId,
            conferenceId: error.conferenceId,
            timestamp: new Date(error.timestamp).toISOString(),
        };
        console.error("MediaSoup Error:", JSON.stringify(logData, null, 2));
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
        if (error.details) {
            console.error("Error details:", error.details);
        }
    }
}
exports.ErrorHandler = ErrorHandler;
exports.errorHandler = new ErrorHandler();
