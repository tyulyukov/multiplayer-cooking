import { useConvexConnectionState } from "convex/react";
import { useNetworkState } from "expo-network";

// Same rule as the web cooking room: the device has a network and the Convex socket is up.
export const useOnline = () => {
  const network = useNetworkState();
  const connection = useConvexConnectionState();
  const reachable = network.isConnected !== false && network.isInternetReachable !== false;

  return reachable && connection.isWebSocketConnected;
};
