/**
 * Event Orchestrator - Centralized event management system
 *
 * This class manages the flow of events between different layers:
 * 1. Socket events from server
 * 2. MediaSoup client events
 * 3. SimpleClient high-level events
 *
 * Features:
 * - Type-safe event handling
 * - Event debugging and logging
 * - Event transformation and normalization
 * - Error handling and recovery
 */

export interface EventOrchestratorConfig {
  enableDebugLogging?: boolean;
  logEventDetails?: boolean;
  maxEventHistory?: number;
}

export interface EventLog {
  timestamp: number;
  source: string;
  eventType: string;
  detail?: any;
  processed: boolean;
}

export type EventSource = "socket" | "mediasoup" | "client" | "internal";

export interface OrchestratedEvent {
  id: string;
  source: EventSource;
  type: string;
  originalEvent: any;
  transformedData?: any;
  timestamp: number;
  processed: boolean;
}

/**
 * Event Orchestrator manages event flow and transformation between different layers
 */
export class EventOrchestrator extends EventTarget {
  private config: EventOrchestratorConfig;
  private eventHistory: EventLog[] = [];
  private eventIdCounter = 0;
  private activeListeners: Map<string, Set<Function>> = new Map();

  constructor(config: EventOrchestratorConfig = {}) {
    super();
    this.config = {
      enableDebugLogging: false,
      logEventDetails: false,
      maxEventHistory: 100,
      ...config,
    };
  }

  /**
   * Register an event source (socket, mediasoup client, etc.)
   */
  registerEventSource(
    source: EventSource,
    eventEmitter: EventTarget,
    eventMappings: Record<string, string>
  ): void {
    this.log(`Registering event source: ${source}`, "info");

    Object.entries(eventMappings).forEach(([sourceEvent, targetEvent]) => {
      const listener = (event: any) => {
        this.handleSourceEvent(source, sourceEvent, targetEvent, event);
      };

      eventEmitter.addEventListener(sourceEvent, listener);

      // Track listeners for cleanup
      const listenerKey = `${source}:${sourceEvent}`;
      if (!this.activeListeners.has(listenerKey)) {
        this.activeListeners.set(listenerKey, new Set());
      }
      this.activeListeners.get(listenerKey)!.add(listener);
    });
  }

  /**
   * Handle events from registered sources
   */
  private handleSourceEvent(
    source: EventSource,
    originalType: string,
    targetType: string,
    event: any
  ): void {
    const orchestratedEvent: OrchestratedEvent = {
      id: `${source}_${this.eventIdCounter++}`,
      source,
      type: targetType,
      originalEvent: event,
      timestamp: Date.now(),
      processed: false,
    };

    this.logEvent(source, originalType, event?.detail);

    try {
      // Transform event data based on source and type
      const transformedData = this.transformEventData(
        source,
        targetType,
        event
      );
      orchestratedEvent.transformedData = transformedData;

      // Emit the transformed event
      this.dispatchEvent(
        new CustomEvent(targetType, {
          detail: transformedData || event?.detail || event,
        })
      );

      orchestratedEvent.processed = true;
      this.log(
        `Successfully processed event: ${source}:${originalType} -> ${targetType}`,
        "success"
      );
    } catch (error) {
      this.log(
        `Error processing event ${source}:${originalType}: ${error}`,
        "error"
      );

      // Emit error event
      this.dispatchEvent(
        new CustomEvent("orchestratorError", {
          detail: {
            source,
            originalType,
            targetType,
            error: error instanceof Error ? error : new Error(String(error)),
            originalEvent: event,
          },
        })
      );
    }

    // Store in history
    this.addToHistory({
      timestamp: orchestratedEvent.timestamp,
      source,
      eventType: `${originalType} -> ${targetType}`,
      detail: orchestratedEvent.transformedData,
      processed: orchestratedEvent.processed,
    });
  }

  /**
   * Transform event data based on source and target type
   */
  private transformEventData(
    source: EventSource,
    targetType: string,
    event: any
  ): any {
    const detail = event?.detail || event;

    switch (source) {
      case "socket":
        return this.transformSocketEvent(targetType, detail);

      case "mediasoup":
        return this.transformMediasoupEvent(targetType, detail);

      case "client":
        return detail; // Client events are already in the right format

      default:
        return detail;
    }
  }

  /**
   * Transform socket events to standard format
   */
  private transformSocketEvent(targetType: string, data: any): any {
    switch (targetType) {
      case "participantJoined":
        return {
          participant: {
            id: data.participantId,
            name: data.participantName || data.name,
            isLocal: false,
          },
        };

      case "participantLeft":
        return {
          participant: {
            id: data.participantId,
            name: data.participantName || data.name,
            isLocal: false,
          },
        };

      case "audioMuted":
      case "audioUnmuted":
      case "videoMuted":
      case "videoUnmuted":
        return {
          participantId: data.participantId,
          isLocal: false,
        };

      case "newProducer":
        return {
          producerId: data.producerId,
          participantId: data.participantId,
          kind: data.kind,
        };

      default:
        return data;
    }
  }

  /**
   * Transform mediasoup events to standard format
   */
  private transformMediasoupEvent(targetType: string, data: any): any {
    switch (targetType) {
      case "remoteStreamAdded":
        return {
          stream: {
            participantId: data.producerId || data.participantId,
            streamId: data.consumerId || data.id,
            stream: data.stream,
            type: data.kind === "audio" ? "audio" : "video",
          },
        };

      case "remoteStreamRemoved":
        return {
          streamId: data.consumerId || data.id,
          participantId: data.producerId || data.participantId,
        };

      case "localStreamReady":
        return {
          stream: data.stream,
        };

      default:
        return data;
    }
  }

  /**
   * Get event history for debugging
   */
  getEventHistory(): EventLog[] {
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
    this.log("Event history cleared", "info");
  }

  /**
   * Get active listener count
   */
  getActiveListenerCount(): number {
    return Array.from(this.activeListeners.values()).reduce(
      (total, listeners) => total + listeners.size,
      0
    );
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.activeListeners.clear();
    this.eventHistory = [];
    this.log("Event orchestrator cleaned up", "info");
  }

  /**
   * Add event to history
   */
  private addToHistory(logEntry: EventLog): void {
    this.eventHistory.push(logEntry);

    // Keep history size under limit
    if (this.eventHistory.length > (this.config.maxEventHistory || 100)) {
      this.eventHistory.shift();
    }
  }

  /**
   * Log events for debugging
   */
  private logEvent(source: string, eventType: string, detail?: any): void {
    if (!this.config.enableDebugLogging) return;

    const message = `[${source.toUpperCase()}] ${eventType}`;

    if (this.config.logEventDetails && detail) {
      console.log(message, detail);
    } else {
      console.log(message);
    }
  }

  /**
   * General logging method
   */
  private log(
    message: string,
    level: "info" | "success" | "error" | "warn" = "info"
  ): void {
    if (!this.config.enableDebugLogging) return;

    const prefix = "[EventOrchestrator]";
    const timestamp = new Date().toISOString();

    switch (level) {
      case "error":
        console.error(`${prefix} ${timestamp} ERROR: ${message}`);
        break;
      case "warn":
        console.warn(`${prefix} ${timestamp} WARN: ${message}`);
        break;
      case "success":
        console.log(`${prefix} ${timestamp} SUCCESS: ${message}`);
        break;
      default:
        console.log(`${prefix} ${timestamp} INFO: ${message}`);
    }
  }

  /**
   * Enable/disable debug logging
   */
  setDebugLogging(enabled: boolean, includeDetails = false): void {
    this.config.enableDebugLogging = enabled;
    this.config.logEventDetails = includeDetails;
    this.log(`Debug logging ${enabled ? "enabled" : "disabled"}`, "info");
  }

  /**
   * Get orchestrator stats
   */
  getStats(): {
    activeListeners: number;
    eventHistorySize: number;
    eventsSinceStart: number;
    debugLogging: boolean;
  } {
    return {
      activeListeners: this.getActiveListenerCount(),
      eventHistorySize: this.eventHistory.length,
      eventsSinceStart: this.eventIdCounter,
      debugLogging: this.config.enableDebugLogging || false,
    };
  }
}

export default EventOrchestrator;
