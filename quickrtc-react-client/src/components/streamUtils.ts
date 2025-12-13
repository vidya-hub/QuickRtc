import { useMemo } from "react";
import type { LocalStream, RemoteStream, StreamType } from "quickrtc-client";

/**
 * Unified stream type for both local and remote streams
 */
export interface UnifiedStream {
  id: string;
  type: StreamType;
  stream: MediaStream;
  isLocal: boolean;
  participantId?: string;
  participantName?: string;
}

/**
 * Convert LocalStream to UnifiedStream
 */
export function localToUnified(
  local: LocalStream,
  participantName?: string
): UnifiedStream {
  return {
    id: local.id,
    type: local.type,
    stream: local.stream,
    isLocal: true,
    participantName: participantName ?? "You",
  };
}

/**
 * Convert RemoteStream to UnifiedStream
 */
export function remoteToUnified(remote: RemoteStream): UnifiedStream {
  return {
    id: remote.id,
    type: remote.type,
    stream: remote.stream,
    isLocal: false,
    participantId: remote.participantId,
    participantName: remote.participantName,
  };
}

/**
 * Hook to unify local and remote streams into a single array
 */
export function useUnifiedStreams(
  localStreams: Map<string, LocalStream>,
  remoteStreams: Map<string, RemoteStream>,
  localName?: string
): UnifiedStream[] {
  return useMemo(() => {
    const unified: UnifiedStream[] = [];

    // Add local streams
    for (const stream of localStreams.values()) {
      unified.push(localToUnified(stream, localName));
    }

    // Add remote streams
    for (const stream of remoteStreams.values()) {
      unified.push(remoteToUnified(stream));
    }

    return unified;
  }, [localStreams, remoteStreams, localName]);
}

/**
 * Hook to get streams filtered by type
 */
export function useStreamsByType<T extends LocalStream | RemoteStream>(
  streams: Map<string, T>,
  type: StreamType
): T[] {
  return useMemo(() => {
    return [...streams.values()].filter((s) => s.type === type);
  }, [streams, type]);
}

/**
 * Get video streams from a Map of streams
 */
export function getVideoStreams<T extends LocalStream | RemoteStream>(
  streams: Map<string, T>
): T[] {
  return [...streams.values()].filter((s) => s.type === "video");
}

/**
 * Get audio streams from a Map of streams
 */
export function getAudioStreams<T extends LocalStream | RemoteStream>(
  streams: Map<string, T>
): T[] {
  return [...streams.values()].filter((s) => s.type === "audio");
}

/**
 * Get screenshare streams from a Map of streams
 */
export function getScreenShareStreams<T extends LocalStream | RemoteStream>(
  streams: Map<string, T>
): T[] {
  return [...streams.values()].filter((s) => s.type === "screenshare");
}

/**
 * Check if streams contain a specific type
 */
export function hasStreamType<T extends LocalStream | RemoteStream>(
  streams: Map<string, T>,
  type: StreamType
): boolean {
  return [...streams.values()].some((s) => s.type === type);
}

/**
 * Get remote streams by participant ID
 */
export function getStreamsByParticipant(
  streams: Map<string, RemoteStream>,
  participantId: string
): RemoteStream[] {
  return [...streams.values()].filter((s) => s.participantId === participantId);
}

/**
 * Hook to get remote streams grouped by participant
 */
export function useStreamsByParticipant(
  streams: Map<string, RemoteStream>
): Map<string, RemoteStream[]> {
  return useMemo(() => {
    const grouped = new Map<string, RemoteStream[]>();
    
    for (const stream of streams.values()) {
      const existing = grouped.get(stream.participantId) ?? [];
      existing.push(stream);
      grouped.set(stream.participantId, existing);
    }
    
    return grouped;
  }, [streams]);
}
