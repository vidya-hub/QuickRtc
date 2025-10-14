# @simple-mediasoup/types

Shared TypeScript type definitions for Simple MediaSoup client and server applications.

## Overview

This package provides comprehensive type-safe interfaces for MediaSoup WebRTC communications, socket events, and application state management. It's designed to be shared between client and server implementations to ensure type consistency across your MediaSoup application.

## Installation

```bash
npm install @simple-mediasoup/types
# or
pnpm add @simple-mediasoup/types
# or
yarn add @simple-mediasoup/types
```

## Usage

### Basic Import

```typescript
import {
  MediasoupConfig,
  JoinConferenceParams,
  CreateTransportParams,
  SocketEventData,
} from "@simple-mediasoup/types";
```

### Category-Specific Imports

```typescript
// Core types
import { ConferenceMap, ParticipantsMap } from "@simple-mediasoup/types/core";

// Transport types
import {
  ProduceParams,
  ConsumeParams,
} from "@simple-mediasoup/types/transport";

// Socket types
import { SocketEventType, MeetingParams } from "@simple-mediasoup/types/socket";

// Client types
import {
  ClientConfig,
  ClientConnectionState,
} from "@simple-mediasoup/types/client";
```

## Type Categories

### Core Types (`/core`)

- `MediasoupConfig` - Server configuration
- `Conference` - Conference entity interface
- `Participant` - Participant entity interface
- `ConferenceMap`, `ParticipantsMap` - Type aliases

### Transport Types (`/transport`)

- `CreateTransportParams` - WebRTC transport creation
- `ConnectTransportParams` - Transport connection
- `ProduceParams` - Media production
- `ConsumeParams` - Media consumption
- `ConsumerResponse` - Consumer creation response

### Conference Types (`/conference`)

- `JoinConferenceParams` - Conference joining
- `AppState` - Application state management

### Socket Types (`/socket`)

- `SocketEventType` - Supported event types
- `SocketEventData` - Event data structure
- `MeetingParams` - Base meeting parameters
- `SocketResponse` - Standard response format

### Client Types (`/client`)

- `ClientConfig` - Client configuration
- `ClientConnectionState` - Connection states
- `MediaConstraints` - Media constraints
- `ClientParticipant` - Client-side participant info

### Utility Types (`/utils`)

- `DeepPartial<T>` - Deep partial utility
- `AsyncResult<T>` - Async operation result
- `Callback<T>` - Callback function type

## Peer Dependencies

This package requires the following peer dependencies:

- `mediasoup ^3.19.0`
- `socket.io ^4.8.0`

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Clean build artifacts
pnpm clean
```

## License

ISC
