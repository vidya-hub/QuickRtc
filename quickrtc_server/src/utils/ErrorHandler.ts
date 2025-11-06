import { EventEmitter } from "events";

export enum ErrorType {
  VALIDATION = "VALIDATION",
  TRANSPORT = "TRANSPORT",
  PRODUCER = "PRODUCER",
  CONSUMER = "CONSUMER",
  CONFERENCE = "CONFERENCE",
  PARTICIPANT = "PARTICIPANT",
  WORKER = "WORKER",
  NETWORK = "NETWORK",
  INTERNAL = "INTERNAL",
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

export class ErrorHandler extends EventEmitter {
  private errors: Map<string, MediasoupError> = new Map();
  private readonly MAX_ERRORS = 1000;

  public handleError(
    type: ErrorType,
    message: string,
    details?: any,
    participantId?: string,
    conferenceId?: string,
    originalError?: Error
  ): MediasoupError {
    const error: MediasoupError = {
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

  public getErrors(
    type?: ErrorType,
    participantId?: string,
    conferenceId?: string
  ): MediasoupError[] {
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

  public clearErrors(olderThanMs?: number): void {
    if (olderThanMs) {
      const cutoffTime = Date.now() - olderThanMs;
      for (const [id, error] of this.errors.entries()) {
        if (error.timestamp < cutoffTime) {
          this.errors.delete(id);
        }
      }
    } else {
      this.errors.clear();
    }
  }

  public getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    recent: number; // Last hour
  } {
    const errors = Array.from(this.errors.values());
    const hourAgo = Date.now() - 60 * 60 * 1000;

    const byType: Record<string, number> = {};
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

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private pruneOldErrors(): void {
    if (this.errors.size > this.MAX_ERRORS) {
      const sortedErrors = Array.from(this.errors.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      );

      // Remove oldest 10%
      const toRemove = Math.floor(this.MAX_ERRORS * 0.1);
      for (let i = 0; i < toRemove; i++) {
        this.errors.delete(sortedErrors[i][0]);
      }
    }
  }

  private logError(error: MediasoupError): void {
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

export const errorHandler = new ErrorHandler();
