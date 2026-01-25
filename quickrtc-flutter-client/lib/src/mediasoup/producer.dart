import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import 'package:quickrtc_flutter_client/src/mediasoup/common/enhanced_event_emitter.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/common/logger.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/rtp_parameters.dart';

// https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
class ProducerCodecOptions {
  final int? opusStereo;
  final int? opusFec;
  final int? opusDtx;
  final int? opusMaxPlaybackRate;
  final int? opusMaxAverageBitrate;
  final int? opusPtime;
  final int? videoGoogleStartBitrate;
  final int? videoGoogleMaxBitrate;
  final int? videoGoogleMinBitrate;

  ProducerCodecOptions({
    this.opusStereo,
    this.opusFec,
    this.opusDtx,
    this.opusMaxPlaybackRate,
    this.opusMaxAverageBitrate,
    this.opusPtime,
    this.videoGoogleStartBitrate,
    this.videoGoogleMaxBitrate,
    this.videoGoogleMinBitrate,
  });

  Map<String, dynamic> toMap() {
    return {
      if (opusStereo != null) 'opusStereo': opusStereo,
      if (opusFec != null) 'opusFec': opusFec,
      if (opusDtx != null) 'opusDtx': opusDtx,
      if (opusMaxPlaybackRate != null)
        'opusMaxPlaybackRate': opusMaxPlaybackRate,
      if (opusMaxAverageBitrate != null)
        'opusMaxAverageBitrate': opusMaxAverageBitrate,
      if (opusPtime != null) 'opusPtime': opusPtime,
      if (videoGoogleStartBitrate != null)
        'videoGoogleStartBitrate': videoGoogleStartBitrate,
      if (videoGoogleMaxBitrate != null)
        'videoGoogleMaxBitrate': videoGoogleMaxBitrate,
      if (videoGoogleMinBitrate != null)
        'videoGoogleMinBitrate': videoGoogleMinBitrate,
    };
  }
}

class ProducerOptions {
  final MediaStreamTrack track;
  final List<RtpEncodingParameters> encodings;
  final ProducerCodecOptions codecOptions;
  final RtpCodecCapability codec;
  final bool stopTracks;
  final bool disableTrackOnPause;
  final bool zeroRtpOnPause;
  final Map<String, dynamic> appData;

  ProducerOptions({
    required this.track,
    required this.encodings,
    required this.codecOptions,
    required this.codec,
    required this.stopTracks,
    required this.disableTrackOnPause,
    required this.zeroRtpOnPause,
    required this.appData,
  });

  // Map<String, dynamic> toMap() {
  //   return {
  //     'track': track,
  //     'encoding': encodings,
  //     'codecOptions': codecOptions,
  //     'codec': codec,
  //     'stopTracks': stopTracks,
  //     'disableTrackOnPause': disableTrackOnPause,
  //     'zeroRtpOnPause': zeroRtpOnPause,
  //     'appData': appData,
  //   };
  // }
}

Logger _logger = Logger('Producer');

class Producer extends EnhancedEventEmitter {
  /// Id.
  final String id;

  /// Local id.
  final String localId;

  /// Closed flag.
  bool closed;

  /// Associated RTCRtpSender.
  RTCRtpSender? rtpSender;

  /// Local track.
  MediaStreamTrack _track;

  /// Get the current track.
  MediaStreamTrack get track => _track;

  /// Producer kind.
  late String kind;

  /// RTP parameters.
  final RtpParameters rtpParameters;

  /// Paused flag.
  late bool paused;

  /// Video max spatial layer.
  late final int? maxSpatialLayer;

  /// Whether the Producer should call stop() in given tracks.
  final bool stopTracks;

  /// Whether the Producer should set track.enabled = false when paused.
  final bool disableTrackOnPause;

  /// Whether we should replace the RTCRtpSender.track with null when paused.
  final bool zeroRtpOnPause;

  /// App custom data.
  final Map<String, dynamic> appData;

  /// Observer.
  ///
  /// @emits close
  /// @emits pause
  /// @emits resume
  /// @emits trackended
  final EnhancedEventEmitter observer;

  /// Stream
  final MediaStream stream;

  /// Source
  final String source;

  /// @emits transportclose
  /// @emits trackended
  /// @emits @replacetrack - (track: MediaStreamTrack | null)
  /// @emits @setmaxspatiallayer - (spatialLayer: string)
  /// @emits @setrtpencodingparameters - (params: any)
  /// @emits @getstats
  /// @emits @close
  Producer({
    required this.id,
    required this.localId,
    this.rtpSender,
    required MediaStreamTrack track,
    required this.rtpParameters,
    required this.stopTracks,
    required this.disableTrackOnPause,
    required this.zeroRtpOnPause,
    required this.appData,
    required this.stream,
    required this.source,
    this.closed = false,
  })  : _track = track,
        observer = EnhancedEventEmitter(),
        super() {
    _logger.debug('constructor()');

    kind = _track.kind!;

    paused = disableTrackOnPause ? !_track.enabled : false;
    maxSpatialLayer = null;
  }

  Producer._copy({
    required this.id,
    required this.localId,
    this.rtpSender,
    required MediaStreamTrack track,
    required this.rtpParameters,
    required this.stopTracks,
    required this.disableTrackOnPause,
    required this.zeroRtpOnPause,
    required this.appData,
    required this.stream,
    required this.source,
    this.closed = false,
    this.maxSpatialLayer,
    required this.paused,
    required this.observer,
    required this.kind,
  })  : _track = track,
        super() {
    _logger.debug('copy()');
  }

  /// Closes the Producer.
  void close() {
    if (closed) return;

    _logger.debug('close()');

    closed = true;

    _destroyTrack();

    emit('@close');

    // Emit observer event.
    observer.safeEmit('close');
  }

  /// Closes the Producer and return new Instance of same Producer.
  Producer closeCopy() {
    if (closed) return this;

    _logger.debug('closeCopy()');

    // closed = true;

    _destroyTrack();

    emit('@close');

    // Emit observer event.
    observer.safeEmit('close');

    return copyWith(closed: true);
  }

  /// Transport was closed.
  void transportClosed() {
    if (closed) return;

    _logger.debug('transportClosed()');

    closed = true;

    _destroyTrack();

    safeEmit('transportclose');

    // Emit observer event.
    observer.safeEmit('close');
  }

  /// Get associated RTCRtpSender stats.
  Future<dynamic> getStats() async {
    if (closed) throw 'closed';

    return safeEmitAsFuture('@getstats');
  }

  /// Pauses sending media.
  void pause() {
    _logger.debug('pause()');

    if (closed) {
      _logger.error('pause() | Producer closed');

      return;
    }

    paused = true;

    if (disableTrackOnPause) {
      track.enabled = false;
    }

    if (zeroRtpOnPause) {
      safeEmitAsFuture('@replacetrack').catchError((error, stackTrace) {});
    }

    // Emit observer event.
    observer.safeEmit('pause');
  }

  /// Pauses sending media and return new Instance of same Producer.
  Producer pauseCopy() {
    _logger.debug('pauseCopy()');

    if (closed) {
      _logger.error('pauseCopy() | Producer closed');

      return this;
    }

    // paused = true;

    if (disableTrackOnPause) {
      track.enabled = false;
    }

    if (zeroRtpOnPause) {
      safeEmitAsFuture('@replacetrack').catchError((error, stackTrace) {});
    }

    // Emit observer event.
    observer.safeEmit('pause');

    return copyWith(paused: true);
  }

  /// Resumes sending media.
  void resume() {
    _logger.debug('resume()');

    if (closed) {
      _logger.error('resume() | Producer closed');

      return;
    }

    paused = false;

    if (disableTrackOnPause) {
      track.enabled = true;
    }

    if (zeroRtpOnPause) {
      safeEmitAsFuture('@replacetrack', {
        'track': track,
      }).catchError((error, stackTrace) {});
    }

    // Emit observer event.
    observer.safeEmit('resume');
  }

  /// Resumes sending media and return new Instance of same Producer.
  Producer resumeCopy() {
    _logger.debug('resumeCopy()');

    if (closed) {
      _logger.error('resumeCopy() | Producer closed');

      return this;
    }

    // paused = false;

    if (disableTrackOnPause) {
      track.enabled = true;
    }

    if (zeroRtpOnPause) {
      safeEmitAsFuture('@replacetrack', {
        'track': track,
      }).catchError((error, stackTrace) {});
    }

    // Emit observer event.
    observer.safeEmit('resume');

    return copyWith(paused: false);
  }

  /// Replaces the current track with a new one.
  Future<void> replaceTrack(MediaStreamTrack newTrack) async {
    _logger.debug('replaceTrack() ${newTrack.toString()}');

    if (closed) {
      // This must be done here. Otherwise there is no chance to stop the given track.
      if (stopTracks) {
        try {
          newTrack.stop();
        } catch (_) { /* ignored */ }
      }
      throw 'closed';
    }

    // Do nothing if this is the same track as the current handled one.
    if (newTrack == _track) {
      _logger.debug('replaceTrack() | same track, ignored.');
      return;
    }

    // Always emit @replacetrack to update the RTCRtpSender's track.
    // This is necessary for both pause/resume scenarios and track switching.
    await safeEmitAsFuture('@replacetrack', {
      'track': newTrack,
    });

    // Stop the previous track if stopTracks is enabled and the track is still active.
    // Note: The track may already be stopped if this is called during resume after pause.
    try {
      _track.onEnded = null;
      if (stopTracks && _track.enabled) {
        _track.stop();
      }
    } catch (error) {
      _logger.warn(
          'replaceTrack() | failed to stop previous track (may already be stopped): $error',);
    }

    // Set the new track.
    _track = newTrack;

    // If this Producer was paused/resumed and the state of the new
    // track does not match, fix it.
    if (disableTrackOnPause) {
      if (!paused) {
        _track.enabled = true;
      } else {
        _track.enabled = false;
      }
    }

    // Handle the effective track.
    _handleTrack();
  }

  /// Sets the video max spatial layer to be sent.
  Future<void> setMaxSpatialLayer(int spatialLayer) async {
    if (closed) {
      throw 'closed';
    } else if (kind != 'video') {
      throw 'not a video Producer';
    }

    if (spatialLayer == maxSpatialLayer) return;

    await safeEmitAsFuture('@setmaxspatiallayer', {
      'spatialLayer': spatialLayer,
    });

    maxSpatialLayer = spatialLayer;
  }

  /// Sets the DSCP value.
  Future<void> setRtpEncodingParameters(RtpEncodingParameters params) async {
    if (closed) {
      throw 'closed';
    }

    await safeEmitAsFuture('@setrtpencodingparameters', {
      'params': params,
    });
  }

  void _onTrackEnded() {
    _logger.debug('track "ended" event');

    safeEmit('trackended');

    // Emit observer event.
    observer.safeEmit('trackended');
  }

  void _handleTrack() {
    _track.onEnded = _onTrackEnded;
  }

  void _destroyTrack() {
    try {
      _track.onEnded = null;

      if (stopTracks) {
        _track.stop();
        stream.dispose();
      }
    } catch (_) { /* ignored */ }
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;

    return other is Producer &&
        other.id == id &&
        other.localId == localId &&
        other.closed == closed &&
        other.rtpSender == rtpSender &&
        other.track == track &&
        other.kind == kind &&
        other.rtpParameters == rtpParameters &&
        other.paused == paused &&
        other.maxSpatialLayer == maxSpatialLayer &&
        other.stopTracks == stopTracks &&
        other.disableTrackOnPause == disableTrackOnPause &&
        other.zeroRtpOnPause == zeroRtpOnPause &&
        mapEquals(other.appData, appData) &&
        other.stream == stream &&
        other.source == source;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        localId.hashCode ^
        closed.hashCode ^
        rtpSender.hashCode ^
        track.hashCode ^
        kind.hashCode ^
        rtpParameters.hashCode ^
        paused.hashCode ^
        maxSpatialLayer.hashCode ^
        stopTracks.hashCode ^
        disableTrackOnPause.hashCode ^
        zeroRtpOnPause.hashCode ^
        appData.hashCode ^
        stream.hashCode ^
        source.hashCode;
  }

  Producer copyWith({
    String? id,
    String? localId,
    bool? closed,
    RTCRtpSender? rtpSender,
    MediaStreamTrack? track,
    String? kind,
    RtpParameters? rtpParameters,
    bool? paused,
    int? maxSpatialLayer,
    bool? stopTracks,
    bool? disableTrackOnPause,
    bool? zeroRtpOnPause,
    Map<String, dynamic>? appData,
    EnhancedEventEmitter? observer,
    MediaStream? stream,
    String? source,
  }) {
    return Producer._copy(
      id: id ?? this.id,
      localId: localId ?? this.localId,
      closed: closed ?? this.closed,
      rtpSender: rtpSender ?? this.rtpSender,
      track: track ?? this.track,
      kind: kind ?? this.kind,
      rtpParameters: rtpParameters ?? this.rtpParameters,
      paused: paused ?? this.paused,
      maxSpatialLayer: maxSpatialLayer ?? this.maxSpatialLayer,
      stopTracks: stopTracks ?? this.stopTracks,
      disableTrackOnPause: disableTrackOnPause ?? this.disableTrackOnPause,
      zeroRtpOnPause: zeroRtpOnPause ?? this.zeroRtpOnPause,
      appData: appData ?? this.appData,
      observer: observer ?? this.observer,
      stream: stream ?? this.stream,
      source: source ?? this.source,
    );
  }
}
