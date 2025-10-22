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
export declare class EventOrchestrator extends EventTarget {
    private config;
    private eventHistory;
    private eventIdCounter;
    private activeListeners;
    constructor(config?: EventOrchestratorConfig);
    /**
     * Register an event source (socket, mediasoup client, etc.)
     */
    registerEventSource(source: EventSource, eventEmitter: EventTarget, eventMappings: Record<string, string>): void;
    /**
     * Handle events from registered sources
     */
    private handleSourceEvent;
    /**
     * Transform event data based on source and target type
     */
    private transformEventData;
    /**
     * Transform socket events to standard format
     */
    private transformSocketEvent;
    /**
     * Transform mediasoup events to standard format
     */
    private transformMediasoupEvent;
    /**
     * Get event history for debugging
     */
    getEventHistory(): EventLog[];
    /**
     * Clear event history
     */
    clearHistory(): void;
    /**
     * Get active listener count
     */
    getActiveListenerCount(): number;
    /**
     * Clean up all listeners
     */
    cleanup(): void;
    /**
     * Add event to history
     */
    private addToHistory;
    /**
     * Log events for debugging
     */
    private logEvent;
    /**
     * General logging method
     */
    private log;
    /**
     * Enable/disable debug logging
     */
    setDebugLogging(enabled: boolean, includeDetails?: boolean): void;
    /**
     * Get orchestrator stats
     */
    getStats(): {
        activeListeners: number;
        eventHistorySize: number;
        eventsSinceStart: number;
        debugLogging: boolean;
    };
}
export default EventOrchestrator;
