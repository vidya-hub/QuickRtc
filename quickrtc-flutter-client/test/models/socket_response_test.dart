import 'package:flutter_test/flutter_test.dart';
import 'package:quickrtc_flutter_client/models/socket_response.dart';

void main() {
  group('SocketResponse', () {
    test('creates success response', () {
      final response = SocketResponse<String>(
        status: 'ok',
        data: 'test data',
      );

      expect(response.status, 'ok');
      expect(response.data, 'test data');
      expect(response.error, isNull);
      expect(response.isSuccess, isTrue);
      expect(response.isError, isFalse);
    });

    test('creates error response', () {
      final response = SocketResponse<String>(
        status: 'error',
        error: 'Something went wrong',
      );

      expect(response.status, 'error');
      expect(response.data, isNull);
      expect(response.error, 'Something went wrong');
      expect(response.isSuccess, isFalse);
      expect(response.isError, isTrue);
    });

    test('fromJson with generic type transformation', () {
      final json = {
        'status': 'ok',
        'data': {'name': 'test'},
      };

      final response = SocketResponse.fromJson(
        json,
        (data) => (data as Map<String, dynamic>)['name'] as String,
      );

      expect(response.status, 'ok');
      expect(response.data, 'test');
    });

    test('fromJson handles error response', () {
      final json = {
        'status': 'error',
        'error': 'Failed to process',
      };

      final response = SocketResponse<String>.fromJson(
        json,
        (data) => data as String,
      );

      expect(response.isError, isTrue);
      expect(response.error, 'Failed to process');
      expect(response.data, isNull);
    });

    test('fromJsonSimple creates response without transformation', () {
      final json = {
        'status': 'ok',
        'data': 'simple string data',
      };

      final response = SocketResponse<String>.fromJsonSimple(json);

      expect(response.status, 'ok');
      expect(response.data, 'simple string data');
    });

    test('fromJsonSimple with map data', () {
      final json = {
        'status': 'ok',
        'data': {'key': 'value'},
      };

      final response =
          SocketResponse<Map<String, dynamic>>.fromJsonSimple(json);

      expect(response.data, {'key': 'value'});
    });

    test('toJson serializes correctly', () {
      final response = SocketResponse<Map<String, dynamic>>(
        status: 'ok',
        data: {'name': 'test'},
      );

      final json = response.toJson((data) => data);

      expect(json['status'], 'ok');
      expect(json['data'], {'name': 'test'});
      expect(json.containsKey('error'), isFalse);
    });

    test('toJson with error', () {
      final response = SocketResponse<String>(
        status: 'error',
        error: 'Test error',
      );

      final json = response.toJson(null);

      expect(json['status'], 'error');
      expect(json['error'], 'Test error');
      expect(json.containsKey('data'), isFalse);
    });

    test('copyWith creates new instance', () {
      final original = SocketResponse<String>(
        status: 'ok',
        data: 'original data',
      );

      final copied = original.copyWith(data: 'new data');

      expect(copied.data, 'new data');
      expect(copied.status, 'ok');
      expect(original.data, 'original data');
    });

    test('copyWith can change status', () {
      final original = SocketResponse<String>(
        status: 'ok',
        data: 'data',
      );

      final copied = original.copyWith(status: 'error', error: 'new error');

      expect(copied.status, 'error');
      expect(copied.error, 'new error');
    });

    test('equality works correctly', () {
      final response1 = SocketResponse<String>(
        status: 'ok',
        data: 'test',
      );

      final response2 = SocketResponse<String>(
        status: 'ok',
        data: 'test',
      );

      final response3 = SocketResponse<String>(
        status: 'ok',
        data: 'different',
      );

      expect(response1, equals(response2));
      expect(response1, isNot(equals(response3)));
    });

    test('toString for success response', () {
      final response = SocketResponse<String>(
        status: 'ok',
        data: 'test data',
      );

      final str = response.toString();
      expect(str, contains('ok'));
      expect(str, contains('test data'));
    });

    test('toString for error response', () {
      final response = SocketResponse<String>(
        status: 'error',
        error: 'error message',
      );

      final str = response.toString();
      expect(str, contains('error'));
      expect(str, contains('error message'));
    });

    test('handles null data in success response', () {
      final response = SocketResponse<String?>(
        status: 'ok',
        data: null,
      );

      expect(response.isSuccess, isTrue);
      expect(response.data, isNull);
    });

    test('works with complex generic types', () {
      final response = SocketResponse<List<Map<String, dynamic>>>(
        status: 'ok',
        data: [
          {'id': 1},
          {'id': 2}
        ],
      );

      expect(response.data?.length, 2);
      expect(response.data?[0]['id'], 1);
    });

    test('fromJson with null data field', () {
      final json = {
        'status': 'ok',
        'data': null,
      };

      final response = SocketResponse<String?>.fromJson(
        json,
        (data) => data as String?,
      );

      expect(response.isSuccess, isTrue);
      expect(response.data, isNull);
    });
  });
}
