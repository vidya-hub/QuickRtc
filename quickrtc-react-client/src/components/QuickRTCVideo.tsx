import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  memo,
  forwardRef,
} from "react";
import type { LocalStream, RemoteStream } from "quickrtc-client";

/**
 * Stream source - can be local or remote stream info, or raw MediaStream
 */
export type StreamSource =
  | LocalStream
  | RemoteStream
  | MediaStream
  | null
  | undefined;

/**
 * Loading state for the video component
 */
export type VideoLoadingState = "idle" | "loading" | "playing" | "error";

/**
 * Props for QuickRTCVideo component
 */
export interface QuickRTCVideoProps {
  /** Stream source - LocalStream, RemoteStream, or raw MediaStream */
  stream?: StreamSource;
  /** Mute the video/audio element (default: false for video, true for local audio) */
  muted?: boolean;
  /** Mirror the video horizontally (useful for local camera, default: false) */
  mirror?: boolean;
  /** Object fit mode */
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  /** Additional class names */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Callback when video starts playing */
  onPlay?: () => void;
  /** Callback when video is paused */
  onPause?: () => void;
  /** Callback when video encounters an error */
  onError?: (error: Event) => void;
  /** Callback when video metadata is loaded (width/height available) */
  onLoadedMetadata?: (event: React.SyntheticEvent<HTMLVideoElement>) => void;
  /** Callback when loading state changes */
  onLoadingStateChange?: (state: VideoLoadingState) => void;
  /** Whether this is an audio-only stream (renders hidden audio element) */
  audioOnly?: boolean;
  /** Custom video element props */
  videoProps?: React.VideoHTMLAttributes<HTMLVideoElement>;
  /** Custom audio element props */
  audioProps?: React.AudioHTMLAttributes<HTMLAudioElement>;
  /** Show placeholder when no stream (default: false) */
  showPlaceholder?: boolean;
  /** Custom placeholder element */
  placeholder?: React.ReactNode;
  /** Show loading indicator (default: false) */
  showLoading?: boolean;
  /** Custom loading element */
  loadingElement?: React.ReactNode;
}

/**
 * Extract MediaStream from various stream source types
 */
function getMediaStream(source: StreamSource): MediaStream | null {
  if (!source) return null;
  if (source instanceof MediaStream) return source;
  if ("stream" in source && source.stream instanceof MediaStream) {
    return source.stream;
  }
  return null;
}

/**
 * Get stream type from source
 */
function getStreamType(
  source: StreamSource
): "audio" | "video" | "screenshare" | null {
  if (!source) return null;
  if (source instanceof MediaStream) return null;
  if ("type" in source) return source.type;
  return null;
}

/**
 * Check if source is a local stream (has track property and pause/resume methods)
 */
function isLocalStream(source: StreamSource): source is LocalStream {
  if (!source) return false;
  if (source instanceof MediaStream) return false;
  return "track" in source && "pause" in source && "resume" in source;
}

/**
 * QuickRTCVideo - Optimized video component for WebRTC streams
 *
 * Handles both local and remote streams with automatic srcObject management.
 * No internal styles - fully customizable via className and style props.
 *
 * @example
 * ```tsx
 * // Local stream
 * <QuickRTCVideo stream={localStream} muted mirror className="w-full h-full" />
 *
 * // Remote stream
 * <QuickRTCVideo stream={remoteStream} className="rounded-lg" />
 *
 * // Audio only
 * <QuickRTCVideo stream={audioStream} audioOnly />
 *
 * // With loading and placeholder
 * <QuickRTCVideo 
 *   stream={remoteStream} 
 *   showLoading 
 *   showPlaceholder
 *   placeholder={<div>No video</div>}
 *   loadingElement={<Spinner />}
 * />
 * ```
 */
export const QuickRTCVideo = memo(
  forwardRef<HTMLVideoElement | HTMLAudioElement, QuickRTCVideoProps>(
    function QuickRTCVideo(
      {
        stream,
        muted,
        mirror = false,
        objectFit,
        className,
        style,
        onPlay,
        onPause,
        onError,
        onLoadedMetadata,
        onLoadingStateChange,
        audioOnly = false,
        videoProps,
        audioProps,
        showPlaceholder = false,
        placeholder,
        showLoading = false,
        loadingElement,
      },
      ref
    ) {
      const internalVideoRef = useRef<HTMLVideoElement>(null);
      const internalAudioRef = useRef<HTMLAudioElement>(null);
      const [loadingState, setLoadingState] = useState<VideoLoadingState>("idle");

      const videoRef =
        (ref as React.RefObject<HTMLVideoElement>) || internalVideoRef;
      const audioRef =
        (ref as React.RefObject<HTMLAudioElement>) || internalAudioRef;

      const mediaStream = getMediaStream(stream);
      const streamType = getStreamType(stream);
      const isLocal = isLocalStream(stream);

      // Determine if this should be treated as audio only
      const isAudioOnly =
        audioOnly ||
        streamType === "audio" ||
        (mediaStream && !mediaStream.getVideoTracks().length);

      // Default muted behavior: muted for local streams, unmuted for remote
      const isMuted = muted !== undefined ? muted : isLocal;

      // Update loading state helper
      const updateLoadingState = useCallback((state: VideoLoadingState) => {
        setLoadingState(state);
        onLoadingStateChange?.(state);
      }, [onLoadingStateChange]);

      // Attach stream to element
      useEffect(() => {
        const element = isAudioOnly ? audioRef.current : videoRef.current;
        if (!element) return;

        if (mediaStream) {
          updateLoadingState("loading");
          element.srcObject = mediaStream;
        } else {
          updateLoadingState("idle");
          element.srcObject = null;
        }

        return () => {
          if (element) {
            element.srcObject = null;
          }
        };
      }, [mediaStream, isAudioOnly, audioRef, videoRef, updateLoadingState]);

      // Compute video styles
      const computedStyle: React.CSSProperties = {
        ...(mirror && { transform: "scaleX(-1)" }),
        ...(objectFit && { objectFit }),
        ...style,
      };

      // Handle play callback
      const handlePlay = useCallback(() => {
        updateLoadingState("playing");
        onPlay?.();
      }, [onPlay, updateLoadingState]);

      // Handle pause callback
      const handlePause = useCallback(() => {
        onPause?.();
      }, [onPause]);

      // Handle error callback
      const handleError = useCallback(
        (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
          updateLoadingState("error");
          onError?.(e.nativeEvent);
        },
        [onError, updateLoadingState]
      );

      // Show placeholder if no stream
      if (!mediaStream && showPlaceholder) {
        if (placeholder) {
          return <>{placeholder}</>;
        }
        // Default placeholder - just an empty div with the same class
        return <div className={className} style={style} data-placeholder />;
      }

      // Show loading indicator
      if (loadingState === "loading" && showLoading && loadingElement) {
        return (
          <>
            {loadingElement}
            {/* Still render the video but hidden to allow it to load */}
            {!isAudioOnly && (
              <video
                ref={internalVideoRef}
                autoPlay
                playsInline
                muted={isMuted}
                onPlay={handlePlay}
                onPause={handlePause}
                onError={handleError}
                onLoadedMetadata={onLoadedMetadata}
                style={{ display: "none" }}
                {...videoProps}
              />
            )}
          </>
        );
      }

      // Render audio element for audio-only streams
      if (isAudioOnly) {
        return (
          <audio
            ref={internalAudioRef}
            autoPlay
            playsInline
            muted={isMuted}
            onPlay={handlePlay}
            onPause={handlePause}
            onError={handleError}
            className={className}
            style={style}
            {...audioProps}
          />
        );
      }

      // Render video element
      return (
        <video
          ref={internalVideoRef}
          autoPlay
          playsInline
          muted={isMuted}
          onPlay={handlePlay}
          onPause={handlePause}
          onError={handleError}
          onLoadedMetadata={onLoadedMetadata}
          className={className}
          style={computedStyle}
          data-loading-state={loadingState}
          {...videoProps}
        />
      );
    }
  )
);

/**
 * Props comparison for memo optimization
 */
function arePropsEqual(
  prevProps: QuickRTCVideoProps,
  nextProps: QuickRTCVideoProps
): boolean {
  // Compare stream by reference or stream ID
  const prevStream = getMediaStream(prevProps.stream);
  const nextStream = getMediaStream(nextProps.stream);

  if (prevStream?.id !== nextStream?.id) return false;
  if (prevProps.muted !== nextProps.muted) return false;
  if (prevProps.mirror !== nextProps.mirror) return false;
  if (prevProps.objectFit !== nextProps.objectFit) return false;
  if (prevProps.className !== nextProps.className) return false;
  if (prevProps.audioOnly !== nextProps.audioOnly) return false;

  return true;
}

// Re-export with custom comparison
export const QuickRTCVideoOptimized = memo(
  QuickRTCVideo,
  arePropsEqual
) as typeof QuickRTCVideo;
