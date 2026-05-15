export const SOCKET_PATH = "/socket.io";

export function getSocketServerUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_SERVER_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
  }

  if (typeof window === "undefined") {
    return "http://localhost:3002";
  }

  return `${window.location.protocol}//${window.location.hostname}:3002`;
}
