import 'package:collection/collection.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/rtp_parameters.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/sdp_object.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/transport.dart';
import 'package:quickrtc_flutter_client/src/mediasoup/handlers/sdp/media_section.dart';

class PlainRtpUtils {
  static PlainRtpParameters extractPlainRtpParameters(
    SdpObject sdpObject,
    RTCRtpMediaType kind,
  ) {
    MediaObject? mediaObject = sdpObject.media.firstWhereOrNull(
      (MediaObject m) => m.type == RTCRtpMediaTypeExtension.value(kind),
    );

    Connection connectionObject =
        (mediaObject!.connection ?? sdpObject.connection)!;

    PlainRtpParameters result = PlainRtpParameters(
      ip: connectionObject.ip,
      ipVersion: connectionObject.version,
      port: mediaObject.port!,
    );

    return result;
  }

  static List<RtpEncodingParameters> getRtpEncodings(
    SdpObject sdpObject,
    RTCRtpMediaType kind,
  ) {
    MediaObject? mediaObject = sdpObject.media.firstWhereOrNull(
      (MediaObject m) => m.type == RTCRtpMediaTypeExtension.value(kind),
    );

    if (mediaObject!.ssrcs != null && mediaObject.ssrcs!.isNotEmpty) {
      Ssrc ssrc = mediaObject.ssrcs!.first;
      RtpEncodingParameters result = RtpEncodingParameters(ssrc: ssrc.id);

      return <RtpEncodingParameters>[result];
    }

    return <RtpEncodingParameters>[];
  }
}
