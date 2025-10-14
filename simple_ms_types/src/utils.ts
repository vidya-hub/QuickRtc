/**
 * Utility types for common operations
 */

/**
 * Makes all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extracts the value type from a Map
 */
export type MapValue<T> = T extends Map<any, infer V> ? V : never;

/**
 * Extracts the key type from a Map
 */
export type MapKey<T> = T extends Map<infer K, any> ? K : never;

/**
 * Creates a type where all properties are required (opposite of Partial)
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Utility type for callback functions
 */
export type Callback<T = any> = (result: T) => void;

/**
 * Utility type for error callback functions
 */
export type ErrorCallback = (error: Error | string) => void;

/**
 * Standard async operation result
 */
export type AsyncResult<T, E = Error> = Promise<{
  success: boolean;
  data?: T;
  error?: E;
}>;

/**
 * Event emitter event map structure
 */
export type EventMap = {
  [event: string]: (...args: any[]) => void;
};
