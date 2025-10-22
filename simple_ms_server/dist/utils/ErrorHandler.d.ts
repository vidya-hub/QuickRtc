import { EventEmitter } from "events";
export declare enum ErrorType {
    VALIDATION = "VALIDATION",
    TRANSPORT = "TRANSPORT",
    PRODUCER = "PRODUCER",
    CONSUMER = "CONSUMER",
    CONFERENCE = "CONFERENCE",
    PARTICIPANT = "PARTICIPANT",
    WORKER = "WORKER",
    NETWORK = "NETWORK",
    INTERNAL = "INTERNAL"
}
export interface MediasoupError {
    id: string;
    type: ErrorType;
    message: string;
    details?: any;
    timestamp: number;
    participantId?: string;
    conferenceId?: string;
    stack?: string;
}
export declare class ErrorHandler extends EventEmitter {
    private errors;
    private readonly MAX_ERRORS;
    handleError(type: ErrorType, message: string, details?: any, participantId?: string, conferenceId?: string, originalError?: Error): MediasoupError;
    getErrors(type?: ErrorType, participantId?: string, conferenceId?: string): MediasoupError[];
    clearErrors(olderThanMs?: number): void;
    getErrorStats(): {
        total: number;
        byType: Record<string, number>;
        recent: number;
    };
    private generateErrorId;
    private pruneOldErrors;
    private logError;
}
export declare const errorHandler: ErrorHandler;
//# sourceMappingURL=ErrorHandler.d.ts.map