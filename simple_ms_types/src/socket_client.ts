import { io, Socket } from "socket.io-client";
import { CreateTransportParams } from "./transport";

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface ServerToClientEvents {
  connect: () => void;
  disconnect: (reason: string) => void;
}

export interface ClientToServerEvents {
  joinConference: (data: any, callback: (response: any) => void) => void;
  leaveConference: (data: any, callback: (response: any) => void) => void;
  createTransport: (
    data: CreateTransportParams,
    callback: (response: any) => void
  ) => void;
  produce: (data: any, callback: (response: any) => void) => void;
  consume: (data: any, callback: (response: any) => void) => void;
  resumeConsumer: (
    data: any,
    callback: (response: any) => void,
    errorback: (error: any) => void
  ) => void;
  connectTransport: (data: any, callback: (response: any) => void) => void;
}
