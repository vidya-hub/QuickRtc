import 'package:flutter/foundation.dart';

abstract class FlexTask {
  final String? id;
  final Function execFun;
  final Function? callbackFun;
  final Function? errorCallbackFun;
  final Object? argument;
  final String? message;

  FlexTask({
    this.id,
    required this.execFun,
    this.argument,
    this.callbackFun,
    this.errorCallbackFun,
    this.message,
  });
}

class FlexTaskAdd extends FlexTask {
  FlexTaskAdd({
    super.id,
    required super.execFun,
    super.argument,
    super.callbackFun,
    super.errorCallbackFun,
    super.message,
  });
}

class FlexTaskRemove extends FlexTask {
  FlexTaskRemove({
    super.id,
    required super.execFun,
    super.argument,
    super.callbackFun,
    super.errorCallbackFun,
    super.message,
  });
}

class FlexQueue {
  bool isBusy = false;
  bool _closed = false;
  final List<FlexTask> taskQueue = [];

  /// Clear all pending tasks and mark the queue as closed.
  /// After calling this, no new tasks will be executed.
  void close() {
    _closed = true;
    taskQueue.clear();
  }

  void addTask(FlexTask task) async {
    // Don't add tasks if the queue is closed
    if (_closed) {
      return;
    }

    if (task is FlexTaskRemove) {
      final int index =
          taskQueue.indexWhere((FlexTask qTask) => qTask.id == task.id);
      if (index != -1) {
        taskQueue.removeAt(index);
        return;
      } else {
        taskQueue.add(task);
        _runTask();
      }
    } else if (task is FlexTaskAdd) {
      taskQueue.add(task);
      _runTask();
    }
  }

  Future<void> _runTask() async {
    // Don't run tasks if the queue is closed
    if (_closed) {
      taskQueue.clear();
      isBusy = false;
      return;
    }

    if (!isBusy) {
      if (taskQueue.isNotEmpty) {
        isBusy = true;
        final FlexTask task = taskQueue.removeAt(0);

        // Check again if closed before executing
        if (_closed) {
          isBusy = false;
          taskQueue.clear();
          return;
        }

        try {
          if (task.argument == null) {
            final result = await task.execFun();
            task.callbackFun?.call(result);
          } else {
            final result = await task.execFun(task.argument);
            task.callbackFun?.call(result);
          }
        } catch (error, st) {
          debugPrint('$error');
          debugPrint('$st');
          task.errorCallbackFun?.call(error);
        } finally {
          isBusy = false;
          _runTask();
        }
      }
    }
  }
}
