import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:sdp_transform/sdp_transform.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/ortc.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/scalability_modes.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/sdp_object.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/transport.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/sctp_parameters.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/rtp_parameters.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/common/logger.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/handlers/handler_interface.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/handlers/sdp/common_utils.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/handlers/sdp/media_section.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/handlers/sdp/remote_sdp.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/handlers/sdp/unified_plan_utils.dart';

Logger _logger = Logger('Unified plan handler');

class UnifiedPlan extends HandlerInterface {
  // Handler direction.
  late Direction _direction;
  // Remote SDP handler.
  late RemoteSdp _remoteSdp;
  // Generic sending RTP parameters for audio and video.
  late Map<RTCRtpMediaType, RtpParameters> _sendingRtpParametersByKind;
  // Generic sending RTP parameters for audio and video suitable for the SDP
  // remote answer.
  late Map<RTCRtpMediaType, RtpParameters> _sendingRemoteRtpParametersByKind;
  // Initial server side DTLS role. If not 'auto', it will force the opposite
  // value in client side.
  DtlsRole? _forcedLocalDtlsRole;
  // RTCPeerConnection instance.
  RTCPeerConnection? _pc;
  // Map of RTCTransceivers indexed by MID.
  final Map<String, RTCRtpTransceiver> _mapMidTransceiver = {};
  // Whether a DataChannel m=application section has been created.
  bool _hasDataChannelMediaSection = false;
  // Sending DataChannel id value counter. Incremented for each new DataChannel.
  int _nextSendSctpStreamId = 0;
  // Got transport local and remote parameters.
  bool _transportReady = false;

  UnifiedPlan() : super();

  Future<void> _setupTransport({
    required DtlsRole localDtlsRole,
    SdpObject? localSdpObject,
  }) async {
    localSdpObject ??=
        SdpObject.fromMap(parse((await _pc!.getLocalDescription())!.sdp!));

    // Get our local DTLS parameters.
    DtlsParameters dtlsParameters =
        CommonUtils.extractDtlsParameters(localSdpObject);

    // Set our DTLS role.
    dtlsParameters.role = localDtlsRole;

    // Update the remote DTLC role in the SDP.
    _remoteSdp.updateDtlsRole(
      localDtlsRole == DtlsRole.client ? DtlsRole.server : DtlsRole.client,
    );

    // Need to tell the remote transport about our parameters.
    await safeEmitAsFuture('@connect', {
      'dtlsParameters': dtlsParameters,
    });

    _transportReady = true;
  }

  void _assertSendRirection() {
    if (_direction != Direction.send) {
      throw ('method can just be called for handlers with "send" direction');
    }
  }

  void _assertRecvDirection() {
    if (_direction != Direction.recv) {
      throw ('method can just be called for handlers with "recv" direction');
    }
  }

  @override
  Future<void> close() async {
    _logger.debug('close()');

    // Close RTCPeerConnection.
    if (_pc != null) {
      try {
        await _pc!.close();
      } catch (_) {/* ignored */}
    }
  }

  @override
  Future<RtpCapabilities> getNativeRtpCapabilities() async {
    _logger.debug('getNativeRtpCapabilities()');

    RTCPeerConnection pc = await createPeerConnection({
      'iceServers': [],
      'iceTransportPolicy': 'all',
      'bundlePolicy': 'max-bundle',
      'rtcpMuxPolicy': 'require',
      'sdpSemantics': 'unified-plan',
    }, {
      'optional': [
        {'DtlsSrtpKeyAgreement': true},
      ],
    });

    try {
      await pc.addTransceiver(kind: RTCRtpMediaType.RTCRtpMediaTypeAudio);
      await pc.addTransceiver(kind: RTCRtpMediaType.RTCRtpMediaTypeVideo);

      RTCSessionDescription offer;
      if (kIsWeb) {
        offer = await pc.createOffer();
      } else {
        offer = await pc.createOffer({});
      }
      final parsedOffer = parse(offer.sdp!);
      SdpObject sdpObject = SdpObject.fromMap(parsedOffer);

      RtpCapabilities nativeRtpCapabilities =
          CommonUtils.extractRtpCapabilities(sdpObject);

      return nativeRtpCapabilities;
    } catch (error) {
      try {
        await pc.close();
      } catch (_) {/* ignored */}

      rethrow;
    }
  }

  @override
  SctpCapabilities getNativeSctpCapabilities() {
    _logger.debug('getNativeSctpCapabilities()');

    return SctpCapabilities(
      numStreams: NumSctpStreams(
        mis: SctpNumStreams.mis,
        os: SctpNumStreams.os,
      ),
    );
  }

  @override
  Future<List<StatsReport>> getReceiverStats(String localId) async {
    _assertRecvDirection();

    RTCRtpTransceiver? transceiver = _mapMidTransceiver[localId];

    if (transceiver == null) {
      throw ('associated RTCRtpTransceiver not found');
    }

    return await transceiver.receiver.getStats();
  }

  @override
  Future<List<StatsReport>> getSenderStats(String localId) async {
    _assertSendRirection();

    RTCRtpTransceiver? transceiver = _mapMidTransceiver[localId];

    if (transceiver == null) {
      throw ('associated RTCRtpTransceiver not found');
    }

    return await transceiver.sender.getStats();
  }

  @override
  Future<List<StatsReport>> getTransportStats() async {
    return await _pc!.getStats();
  }

  @override
  String get name => 'Unified plan handler';

  @override
  Future<HandlerReceiveResult> receive(HandlerReceiveOptions options) async {
    _assertRecvDirection();

    _logger.debug(
      'receive() [trackId:${options.trackId}, kind:${RTCRtpMediaTypeExtension.value(options.kind)}]',
    );

    String localId =
        options.rtpParameters.mid ?? _mapMidTransceiver.length.toString();

    _remoteSdp.receive(
      mid: localId,
      kind: options.kind,
      offerRtpParameters: options.rtpParameters,
      streamId: options.rtpParameters.rtcp?.cname ?? '',
      trackId: options.trackId,
    );

    RTCSessionDescription offer = RTCSessionDescription(
      _remoteSdp.getSdp(),
      'offer',
    );

    _logger.debug(
      'receive() | calling pc.setRemoteDescription() [offer:${offer.toMap()}]',
    );

    await _pc!.setRemoteDescription(offer);

    RTCSessionDescription answer;
    if (kIsWeb) {
      answer = await _pc!.createAnswer();
    } else {
      answer = await _pc!.createAnswer({});
    }

    SdpObject localSdpObject = SdpObject.fromMap(parse(answer.sdp!));

    MediaObject? answerMediaObject = localSdpObject.media.firstWhereOrNull(
      (MediaObject m) => m.mid == localId,
    );

    // May need to modify codec parameters in the answer based on codec
    // parameters in the offer.
    CommonUtils.applyCodecParameters(options.rtpParameters, answerMediaObject);

    answer = RTCSessionDescription(
      write(localSdpObject.toMap(), null),
      'answer',
    );

    if (!_transportReady) {
      await _setupTransport(
        localDtlsRole: DtlsRole.client,
        localSdpObject: localSdpObject,
      );
    }

    _logger.debug(
      'receive() | calling pc.setLocalDescription() [answer:${answer.toMap()}]',
    );

    await _pc!.setLocalDescription(answer);

    final transceivers = await _pc!.getTransceivers();

    RTCRtpTransceiver? transceiver = transceivers.firstWhereOrNull(
      (RTCRtpTransceiver t) => t.mid == localId,
      // orElse: () => null,
    );

    if (transceiver == null) {
      throw ('new RTCRtpTransceiver not found');
    }

    // Store in the map.
    _mapMidTransceiver[localId] = transceiver;

    MediaStream? stream = _pc!
        .getRemoteStreams()
        .firstWhereOrNull((e) => e?.id == options.rtpParameters.rtcp!.cname);

    // On Android, getRemoteStreams() may not immediately have the stream after
    // SDP negotiation. In this case, create a local MediaStream and add the track.
    // This is a workaround for Android WebRTC timing issues with existing streams.
    if (stream == null) {
      _logger.debug(
        'receive() | Stream not found in getRemoteStreams(), creating fallback stream',
      );

      // Create a fallback stream with the track
      stream = await createLocalMediaStream(
        'fallback_${options.trackId}_${DateTime.now().millisecondsSinceEpoch}',
      );
      stream.addTrack(transceiver.receiver.track!);
    }

    return HandlerReceiveResult(
      localId: localId,
      track: transceiver.receiver.track!,
      rtpReceiver: transceiver.receiver,
      stream: stream,
    );
  }

  @override
  Future<HandlerReceiveDataChannelResult> receiveDataChannel(
    HandlerReceiveDataChannelOptions options,
  ) async {
    _assertRecvDirection();

    RTCDataChannelInit initOptions = RTCDataChannelInit();
    initOptions.negotiated = true;
    initOptions.id = options.sctpStreamParameters.streamId;
    initOptions.ordered =
        options.sctpStreamParameters.ordered ?? initOptions.ordered;
    initOptions.maxRetransmitTime =
        options.sctpStreamParameters.maxPacketLifeTime ??
            initOptions.maxRetransmitTime;
    initOptions.maxRetransmits = options.sctpStreamParameters.maxRetransmits ??
        initOptions.maxRetransmits;
    initOptions.protocol = options.protocol;

    _logger.debug('receiveDataChannel() [options:${initOptions.toMap()}]');

    RTCDataChannel dataChannel =
        await _pc!.createDataChannel(options.label, initOptions);

    // If this is the first DataChannel we need to create the SDP offer with
    // m=application section.
    if (!_hasDataChannelMediaSection) {
      _remoteSdp.receiveSctpAssociation();

      RTCSessionDescription offer =
          RTCSessionDescription(_remoteSdp.getSdp(), 'offer');

      _logger.debug(
        'receiveDataChannel() | calling pc.setRemoteDescription() [offer:${offer.toMap()}]',
      );

      await _pc!.setRemoteDescription(offer);

      RTCSessionDescription answer;
      if (kIsWeb) {
        answer = await _pc!.createAnswer();
      } else {
        answer = await _pc!.createAnswer({});
      }

      if (!_transportReady) {
        SdpObject localSdpObject = SdpObject.fromMap(parse(answer.sdp!));

        await _setupTransport(
          localDtlsRole: _forcedLocalDtlsRole ?? DtlsRole.client,
          localSdpObject: localSdpObject,
        );
      }

      _logger.debug(
        'receiveDataChannel() | calling pc.setRemoteDescription() [answer: ${answer.toMap()}',
      );

      await _pc!.setLocalDescription(answer);

      _hasDataChannelMediaSection = true;
    }

    return HandlerReceiveDataChannelResult(dataChannel: dataChannel);
  }

  @override
  Future<void> replaceTrack(ReplaceTrackOptions options) async {
    _assertSendRirection();

    if (options.track != null) {
      _logger.debug(
        'replaceTrack() [localId:${options.localId}, track.id:${options.track!.id}]',
      );
    } else {
      _logger.debug('replaceTrack() [localId:${options.localId}, no track]');
    }

    RTCRtpTransceiver? transceiver = _mapMidTransceiver[options.localId];

    if (transceiver == null) {
      throw ('associated RTCRtpTransceiver not found');
    }

    await transceiver.sender.replaceTrack(options.track);
    // Note: Do NOT remove the transceiver from the map here.
    // The transceiver is still valid and needed for future track replacements
    // (e.g., when resuming camera after pausing).
  }

  @override
  Future<void> restartIce(IceParameters iceParameters) async {
    _logger.debug('restartIce()');

    // Provide the remote SDP handler with new remote Ice parameters.
    _remoteSdp.updateIceParameters(iceParameters);

    if (!_transportReady) {
      return;
    }

    if (_direction == Direction.send) {
      RTCSessionDescription offer =
          await _pc!.createOffer({'iceRestart': true});

      _logger.debug(
        'restartIce() | calling pc.setLocalDescription() [offer:${offer.toMap()}]',
      );

      await _pc!.setLocalDescription(offer);

      RTCSessionDescription answer =
          RTCSessionDescription(_remoteSdp.getSdp(), 'answer');

      _logger.debug(
        'restartIce() | calling pc.setRemoteDescription() [answer:${answer.toMap()}]',
      );

      await _pc!.setRemoteDescription(answer);
    } else {
      RTCSessionDescription offer =
          RTCSessionDescription(_remoteSdp.getSdp(), 'offer');

      _logger.debug(
        'restartIce() | calling pc.setRemoteDescription() [offer:${offer.toMap()}]',
      );

      await _pc!.setRemoteDescription(offer);

      RTCSessionDescription? answer;
      if (kIsWeb) {
        answer = await _pc!.createAnswer();
      } else {
        answer = await _pc!.createAnswer({});
      }

      _logger.debug(
        'restartIce() | calling pc.setLocalDescription() [answer:${answer.toMap()}]',
      );

      await _pc!.setLocalDescription(answer);
    }
  }

  @override
  void run({required HandlerRunOptions options}) async {
    _logger.debug('run()');

    _direction = options.direction;

    _remoteSdp = RemoteSdp(
      iceParameters: options.iceParameters,
      iceCandidates: options.iceCandidates,
      dtlsParameters: options.dtlsParameters,
      sctpParameters: options.sctpParameters,
    );

    _sendingRtpParametersByKind = {
      RTCRtpMediaType.RTCRtpMediaTypeAudio: Ortc.getSendingRtpParameters(
        RTCRtpMediaType.RTCRtpMediaTypeAudio,
        options.extendedRtpCapabilities,
      ),
      RTCRtpMediaType.RTCRtpMediaTypeVideo: Ortc.getSendingRtpParameters(
        RTCRtpMediaType.RTCRtpMediaTypeVideo,
        options.extendedRtpCapabilities,
      ),
    };

    _sendingRemoteRtpParametersByKind = {
      RTCRtpMediaType.RTCRtpMediaTypeAudio: Ortc.getSendingRemoteRtpParameters(
        RTCRtpMediaType.RTCRtpMediaTypeAudio,
        options.extendedRtpCapabilities,
      ),
      RTCRtpMediaType.RTCRtpMediaTypeVideo: Ortc.getSendingRemoteRtpParameters(
        RTCRtpMediaType.RTCRtpMediaTypeVideo,
        options.extendedRtpCapabilities,
      ),
    };

    if (options.dtlsParameters.role != DtlsRole.auto) {
      _forcedLocalDtlsRole = options.dtlsParameters.role == DtlsRole.server
          ? DtlsRole.client
          : DtlsRole.server;
    }

    final constrains = options.proprietaryConstraints.isEmpty
        ? <String, dynamic>{
            'mandatory': {},
            'optional': [
              {'DtlsSrtpKeyAgreement': true},
            ],
          }
        : options.proprietaryConstraints;

    constrains['optional'] = [
      ...constrains['optional'],
      {'DtlsSrtpKeyAgreement': true},
    ];

    _pc = await createPeerConnection(
      {
        'iceServers':
            options.iceServers.map((RTCIceServer i) => i.toMap()).toList(),
        'iceTransportPolicy': options.iceTransportPolicy?.value ?? 'all',
        'bundlePolicy': 'max-bundle',
        'rtcpMuxPolicy': 'require',
        'sdpSemantics': 'unified-plan',
        ...options.additionalSettings,
      },
      constrains,
    );

    // Handle RTCPeerConnection connection status.
    _pc!.onIceConnectionState = (RTCIceConnectionState state) {
      switch (_pc!.iceConnectionState) {
        case RTCIceConnectionState.RTCIceConnectionStateChecking:
          {
            emit('@connectionstatechange', {'state': 'connecting'});
            break;
          }
        case RTCIceConnectionState.RTCIceConnectionStateConnected:
        case RTCIceConnectionState.RTCIceConnectionStateCompleted:
          {
            emit('@connectionstatechange', {'state': 'connected'});
            break;
          }
        case RTCIceConnectionState.RTCIceConnectionStateFailed:
          {
            emit('@connectionstatechange', {'state': 'failed'});
            break;
          }
        case RTCIceConnectionState.RTCIceConnectionStateDisconnected:
          {
            emit('@connectionstatechange', {'state': 'disconnected'});
            break;
          }
        case RTCIceConnectionState.RTCIceConnectionStateClosed:
          {
            emit('@connectionstatechange', {'state': 'closed'});
            break;
          }

        default:
          break;
      }
    };
  }

  @override
  Future<HandlerSendResult> send(HandlerSendOptions options) async {
    _assertSendRirection();

    _logger.debug(
      'send() [kind:${options.track.kind}, track.id:${options.track.id}',
    );

    if (options.encodings.length > 1) {
      int idx = 0;
      for (var encoding in options.encodings) {
        encoding.rid = 'r${idx++}';
      }
    }

    RtpParameters sendingRtpParameters = RtpParameters.copy(
      _sendingRtpParametersByKind[
          RTCRtpMediaTypeExtension.fromString(options.track.kind!)]!,
    );

    // This may throw.
    sendingRtpParameters.codecs =
        Ortc.reduceCodecs(sendingRtpParameters.codecs, options.codec);

    RtpParameters sendingRemoteRtpParameters = RtpParameters.copy(
      _sendingRemoteRtpParametersByKind[
          RTCRtpMediaTypeExtension.fromString(options.track.kind!)]!,
    );

    // This may throw.
    sendingRemoteRtpParameters.codecs =
        Ortc.reduceCodecs(sendingRemoteRtpParameters.codecs, options.codec);

    MediaSectionIdx mediaSectionIdx = _remoteSdp.getNextMediaSectionIdx();

    RTCRtpTransceiver transceiver = await _pc!.addTransceiver(
      track: options.track,
      kind: RTCRtpMediaTypeExtension.fromString(options.track.kind!),
      init: RTCRtpTransceiverInit(
        direction: TransceiverDirection.SendOnly,
        streams: [options.stream],
        sendEncodings: options.encodings,
      ),
    );

    RTCSessionDescription offer;
    if (kIsWeb) {
      offer = await _pc!.createOffer();
    } else {
      offer = await _pc!.createOffer({});
    }
    SdpObject localSdpObject = SdpObject.fromMap(parse(offer.sdp!));
    MediaObject offerMediaObject;

    if (!_transportReady) {
      await _setupTransport(
        localDtlsRole: DtlsRole.server,
        localSdpObject: localSdpObject,
      );
    }

    // Speacial case for VP9 with SVC.
    bool hackVp9Svc = false;

    ScalabilityMode layers = ScalabilityMode.parse(
      (options.encodings.isNotEmpty
              ? options.encodings
              : [RtpEncodingParameters(scalabilityMode: '')])
          .first
          .scalabilityMode!,
    );

    if (options.encodings.length == 1 &&
        layers.spatialLayers > 1 &&
        sendingRtpParameters.codecs.first.mimeType.toLowerCase() ==
            'video/vp9') {
      _logger.debug('send() | enabling legacy simulcast for VP9 SVC');

      hackVp9Svc = true;
      localSdpObject = SdpObject.fromMap(parse(offer.sdp!));
      offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];

      UnifiedPlanUtils.addLegacySimulcast(
        offerMediaObject,
        layers.spatialLayers,
      );

      offer =
          RTCSessionDescription(write(localSdpObject.toMap(), null), 'offer');
    }

    _logger.debug(
      'send() | calling pc.setLocalDescription() [offer:${offer.toMap()}',
    );

    await _pc!.setLocalDescription(offer);

    if (!kIsWeb) {
      final transceivers = await _pc!.getTransceivers();
      transceiver = transceivers.firstWhere(
        (transceiver) =>
            transceiver.sender.track?.id == options.track.id &&
            transceiver.sender.track?.kind == options.track.kind,
        orElse: () => throw 'No transceiver found',
      );
    }

    // We can now get the transceiver.mid.
    String localId = transceiver.mid;
    if (localId.isEmpty) {
      // Re-fetch transceiver to be sure.
      final transceivers = await _pc!.getTransceivers();
      transceiver = transceivers.firstWhere(
        (t) => t.sender.track?.id == options.track.id,
        orElse: () => transceiver,
      );
      localId = transceiver.mid;
    }
    
    if (localId.isEmpty) {
      throw 'Transceiver mid not found after setLocalDescription';
    }

    // Set MID.
    sendingRtpParameters.mid = localId;

    localSdpObject =
        SdpObject.fromMap(parse((await _pc!.getLocalDescription())!.sdp!));
    offerMediaObject = localSdpObject.media.firstWhere(
      (m) => m.mid == localId,
      orElse: () => throw 'Media section with mid $localId not found in offer',
    );

    // Update payload types in sendingRtpParameters and sendingRemoteRtpParameters
    // based on the actual offer.
    
    // Pass 1: Primary codecs
    for (RtpCodecParameters codec in sendingRtpParameters.codecs) {
      if (Ortc.isRtxCodec(codec)) continue;
      final String codecName = getCodecName(codec);
      final Rtp? matchingRtp = offerMediaObject.rtp?.firstWhereOrNull(
        (Rtp r) =>
            r.codec.toLowerCase() == codecName.toLowerCase() &&
            r.rate == codec.clockRate &&
            r.encoding == codec.channels,
      );

      if (matchingRtp != null) {
        codec.payloadType = matchingRtp.payload;
      }
    }

    for (RtpCodecParameters codec in sendingRemoteRtpParameters.codecs) {
      if (Ortc.isRtxCodec(codec)) continue;
      final String codecName = getCodecName(codec);
      final Rtp? matchingRtp = offerMediaObject.rtp?.firstWhereOrNull(
        (Rtp r) =>
            r.codec.toLowerCase() == codecName.toLowerCase() &&
            r.rate == codec.clockRate &&
            r.encoding == codec.channels,
      );

      if (matchingRtp != null) {
        codec.payloadType = matchingRtp.payload;
      }
    }

    // Pass 2: RTX codecs (using updated primary PTs)
    for (RtpCodecParameters codec in sendingRtpParameters.codecs) {
      if (!Ortc.isRtxCodec(codec)) continue;

      final int? apt = codec.parameters['apt'];
      if (apt == null) continue;

      // Find the corresponding RTX PT in the offer by looking for 'apt=X' where X is a PT in the offer
      // that matches one of our primary codecs.
      for (Rtp offerRtp in offerMediaObject.rtp ?? []) {
         // Check if this offer PT is an RTX PT for some primary PT
         final Fmtp? fmtp = offerMediaObject.fmtp?.firstWhereOrNull(
           (f) => f.payload == offerRtp.payload && f.config.contains('apt='),
         );
         
         if (fmtp != null) {
           final int offerApt = int.parse(parseParams(fmtp.config)['apt'].toString());
           // Does this offerApt match any of our updated primary PTs?
           final bool matchesPrimary = sendingRtpParameters.codecs.any((c) => !Ortc.isRtxCodec(c) && c.payloadType == offerApt);
           if (matchesPrimary) {
             codec.payloadType = fmtp.payload;
             codec.parameters['apt'] = offerApt;
             break;
           }
         }
      }
    }

    for (RtpCodecParameters codec in sendingRemoteRtpParameters.codecs) {
      if (!Ortc.isRtxCodec(codec)) continue;

      final int? apt = codec.parameters['apt'];
      if (apt == null) continue;

      for (Rtp offerRtp in offerMediaObject.rtp ?? []) {
         final Fmtp? fmtp = offerMediaObject.fmtp?.firstWhereOrNull(
           (f) => f.payload == offerRtp.payload && f.config.contains('apt='),
         );
         
         if (fmtp != null) {
           final int offerApt = int.parse(parseParams(fmtp.config)['apt'].toString());
           final bool matchesPrimary = sendingRemoteRtpParameters.codecs.any((c) => !Ortc.isRtxCodec(c) && c.payloadType == offerApt);
           if (matchesPrimary) {
             codec.payloadType = fmtp.payload;
             codec.parameters['apt'] = offerApt;
             break;
           }
         }
      }
    }

    // Pass 3: Header Extensions
    for (RtpHeaderExtensionParameters ext in sendingRtpParameters.headerExtensions) {
      final Ext? matchingExt = offerMediaObject.ext?.firstWhereOrNull((e) => e.uri == ext.uri);
      if (matchingExt != null) {
        ext.id = matchingExt.value!;
      }
    }

    for (RtpHeaderExtensionParameters ext in sendingRemoteRtpParameters.headerExtensions) {
      final Ext? matchingExt = offerMediaObject.ext?.firstWhereOrNull((e) => e.uri == ext.uri);
      if (matchingExt != null) {
        ext.id = matchingExt.value!;
      }
    }

    // Set RTCP CNAME.
    sendingRtpParameters.rtcp!.cname = CommonUtils.getCname(offerMediaObject);

    // Set RTP encdoings by parsing the SDP offer if no encoding are given.
    if (options.encodings.isEmpty) {
      sendingRtpParameters.encodings =
          UnifiedPlanUtils.getRtpEncodings(offerMediaObject);
    }
    // Set RTP encodings by parsing the SDP offer and complete them with given
    // one if just a single encoding has been given.
    else if (options.encodings.length == 1) {
      List<RtpEncodingParameters> newEncodings =
          UnifiedPlanUtils.getRtpEncodings(offerMediaObject);

      newEncodings[0] =
          RtpEncodingParameters.assign(newEncodings[0], options.encodings[0]);

      // Hack for VP9 SVC.
      if (hackVp9Svc) {
        newEncodings = [newEncodings[0]];
      }

      sendingRtpParameters.encodings = newEncodings;
    }
    // Otherwise if more than 1 encoding are given use them verbatim.
    else {
      sendingRtpParameters.encodings = options.encodings;
    }

    // If VP8 or H264 and there is effective simulcast, add scalabilityMode to
    // each encoding.
    if (sendingRtpParameters.encodings.length > 1 &&
        (sendingRtpParameters.codecs[0].mimeType.toLowerCase() == 'video/vp8' ||
            sendingRtpParameters.codecs[0].mimeType.toLowerCase() ==
                'video/h264')) {
      for (RtpEncodingParameters encoding in sendingRtpParameters.encodings) {
        encoding.scalabilityMode = 'S1T3';
      }
    }

    _remoteSdp.send(
      offerMediaObject: offerMediaObject,
      offerRtpParameters: sendingRtpParameters,
      answerRtpParameters: sendingRemoteRtpParameters,
      codecOptions: options.codecOptions,
      extmapAllowMixed: true,
    );

    RTCSessionDescription answer =
        RTCSessionDescription(_remoteSdp.getSdp(), 'answer');

    _logger.debug(
      'send() | calling pc.setRemoteDescription() [answer:${answer.toMap()}]',
    );

    await _pc!.setRemoteDescription(answer);

    // Store in the map.
    _mapMidTransceiver[localId] = transceiver;

    return HandlerSendResult(
      localId: localId,
      rtpParameters: sendingRtpParameters,
      rtpSender: transceiver.sender,
    );
  }

  @override
  Future<HandlerSendDataChannelResult> sendDataChannel(
    SendDataChannelArguments options,
  ) async {
    _assertSendRirection();

    RTCDataChannelInit initOptions = RTCDataChannelInit();
    initOptions.negotiated = true;
    initOptions.id = _nextSendSctpStreamId;
    initOptions.ordered = options.ordered ?? initOptions.ordered;
    initOptions.maxRetransmitTime =
        options.maxPacketLifeTime ?? initOptions.maxRetransmitTime;
    initOptions.maxRetransmits =
        options.maxRetransmits ?? initOptions.maxRetransmits;
    initOptions.protocol = options.protocol ?? initOptions.protocol;
    // initOptions.priority = options.priority;

    _logger.debug('sendDataChannel() [options:${initOptions.toMap()}]');

    RTCDataChannel dataChannel =
        await _pc!.createDataChannel(options.label!, initOptions);

    // Increase next id.
    _nextSendSctpStreamId = ++_nextSendSctpStreamId % SctpNumStreams.mis;

    // If this is the first DataChannel we need to create the SDP answer with
    // m=application section.
    if (!_hasDataChannelMediaSection) {
      RTCSessionDescription offer;
      if (kIsWeb) {
        offer = await _pc!.createOffer();
      } else {
        offer = await _pc!.createOffer({});
      }
      SdpObject localSdpObject = SdpObject.fromMap(parse(offer.sdp!));
      MediaObject? offerMediaObject = localSdpObject.media.firstWhereOrNull(
        (MediaObject m) => m.type == 'application',
      );

      if (!_transportReady) {
        await _setupTransport(
          localDtlsRole: _forcedLocalDtlsRole ?? DtlsRole.client,
          localSdpObject: localSdpObject,
        );
      }

      _logger.debug(
        'sendDataChannel() | calling pc.setLocalDescription() [offer:${offer.toMap()}',
      );

      await _pc!.setLocalDescription(offer);

      _remoteSdp.sendSctpAssociation(offerMediaObject!);

      RTCSessionDescription answer =
          RTCSessionDescription(_remoteSdp.getSdp(), 'answer');

      _logger.debug(
        'sendDataChannel() | calling pc.setRemoteDescription() [answer:${answer.toMap()}]',
      );

      await _pc!.setRemoteDescription(answer);

      _hasDataChannelMediaSection = true;
    }

    SctpStreamParameters sctpStreamParameters = SctpStreamParameters(
      streamId: initOptions.id,
      ordered: initOptions.ordered,
      maxPacketLifeTime: initOptions.maxRetransmitTime,
      maxRetransmits: initOptions.maxRetransmits,
    );

    return HandlerSendDataChannelResult(
      dataChannel: dataChannel,
      sctpStreamParameters: sctpStreamParameters,
    );
  }

  @override
  Future<void> setMaxSpatialLayer(SetMaxSpatialLayerOptions options) async {
    _assertSendRirection();

    _logger.debug(
      'setMaxSpatialLayer() [localId:${options.localId}, spatialLayer:${options.spatialLayer}',
    );

    RTCRtpTransceiver? transceiver = _mapMidTransceiver[options.localId];

    if (transceiver == null) {
      throw ('associated RTCRtpTransceiver not found');
    }

    RTCRtpParameters parameters = transceiver.sender.parameters;

    int idx = 0;
    for (var encoding in parameters.encodings!) {
      if (idx <= options.spatialLayer) {
        encoding.active = true;
      } else {
        encoding.active = false;
      }
      idx++;
    }

    await transceiver.sender.setParameters(parameters);
  }

  @override
  Future<void> setRtpEncodingParameters(
    SetRtpEncodingParametersOptions options,
  ) async {
    _assertSendRirection();

    _logger.debug(
      'setRtpEncodingParameters() [localId:${options.localId}, params:${options.params}]',
    );

    RTCRtpTransceiver? transceiver = _mapMidTransceiver[options.localId];

    if (transceiver == null) {
      throw ('associated RTCRtpTransceiver not found');
    }

    RTCRtpParameters parameters = transceiver.sender.parameters;

    int idx = 0;
    for (var encoding in parameters.encodings!) {
      parameters.encodings![idx] = RTCRtpEncoding(
        active: options.params.active,
        maxBitrate: options.params.maxBitrate ?? encoding.maxBitrate,
        maxFramerate: options.params.maxFramerate ?? encoding.maxFramerate,
        minBitrate: options.params.minBitrate ?? encoding.minBitrate,
        numTemporalLayers:
            options.params.numTemporalLayers ?? encoding.numTemporalLayers,
        rid: options.params.rid ?? encoding.rid,
        scaleResolutionDownBy: options.params.scaleResolutionDownBy ??
            encoding.scaleResolutionDownBy,
        ssrc: options.params.ssrc ?? encoding.ssrc,
      );
      idx++;
    }

    await transceiver.sender.setParameters(parameters);
  }

  @override
  Future<void> stopReceiving(String localId) async {
    _assertRecvDirection();

    _logger.debug('stopReceiving() [localId:$localId');

    RTCRtpTransceiver? transceiver = _mapMidTransceiver[localId];

    if (transceiver == null) {
      throw ('associated RTCRtpTransceiveer not found');
    }

    _remoteSdp.closeMediaSection(transceiver.mid);

    RTCSessionDescription offer =
        RTCSessionDescription(_remoteSdp.getSdp(), 'offer');

    _logger.debug(
      'stopReceiving() | calling pc.setRemoteDescription() [offer:${offer.toMap()}',
    );

    await _pc!.setRemoteDescription(offer);

    RTCSessionDescription answer;
    if (kIsWeb) {
      answer = await _pc!.createAnswer();
    } else {
      answer = await _pc!.createAnswer({});
    }

    _logger.debug(
      'stopReceiving() | calling pc.setLocalDescription() [answer:${answer.toMap()}',
    );

    await _pc!.setLocalDescription(answer);
    _mapMidTransceiver.remove(localId);
  }

  @override
  Future<void> stopSending(String localId) async {
    _assertSendRirection();

    _logger.debug('stopSending() [localId:$localId]');

    RTCRtpTransceiver? transceiver = _mapMidTransceiver[localId];

    if (transceiver == null) {
      throw ('associated RTCRtpTransceiver not found');
    }

    // await transceiver.sender.replaceTrack(null);
    await _pc!.removeTrack(transceiver.sender);
    _remoteSdp.closeMediaSection(transceiver.mid);

    RTCSessionDescription offer;
    if (kIsWeb) {
      offer = await _pc!.createOffer();
    } else {
      offer = await _pc!.createOffer({});
    }

    _logger.debug(
      'stopSending() | calling pc.setLocalDescription() [offer:${offer.toMap()}',
    );

    await _pc!.setLocalDescription(offer);

    RTCSessionDescription answer =
        RTCSessionDescription(_remoteSdp.getSdp(), 'answer');

    _logger.debug(
      'stopSending() | calling pc.setRemoteDescription() [answer:${answer.toMap()}',
    );

    await _pc!.setRemoteDescription(answer);
    _mapMidTransceiver.remove(localId);
  }

  @override
  Future<void> updateIceServers(List<RTCIceServer> iceServers) async {
    _logger.debug('updateIceServers()');

    Map<String, dynamic> configuration = _pc!.getConfiguration;

    configuration['iceServers'] =
        iceServers.map((RTCIceServer ice) => ice.toMap()).toList();

    await _pc!.setConfiguration(configuration);
  }
}
