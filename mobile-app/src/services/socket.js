import { io } from 'socket.io-client';

const DEFAULT_SERVER_URL = 'http://10.7.4.252:3000';

let socket = null;

export function connect(serverUrl = DEFAULT_SERVER_URL) {
  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(serverUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  return socket;
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
