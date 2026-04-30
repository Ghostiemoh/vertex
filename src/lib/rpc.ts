import { Connection } from "@solana/web3.js";
import {
  DEFAULT_RPC_ENDPOINT,
  SERVER_FALLBACK_RPC_ENDPOINT,
  SERVER_RPC_ENDPOINT,
  SERVER_RPC_WS_ENDPOINT,
} from "@/lib/config";

const commitment = "confirmed" as const;

let primaryServerConnection: Connection | null = null;
let fallbackServerConnection: Connection | null = null;

function createConnection(endpoint: string, wsEndpoint?: string): Connection {
  return new Connection(endpoint, {
    commitment,
    wsEndpoint,
  });
}

export function getServerConnections(): Connection[] {
  if (!primaryServerConnection) {
    primaryServerConnection = createConnection(SERVER_RPC_ENDPOINT, SERVER_RPC_WS_ENDPOINT);
  }

  const connections = [primaryServerConnection];
  if (
    SERVER_FALLBACK_RPC_ENDPOINT &&
    SERVER_FALLBACK_RPC_ENDPOINT !== SERVER_RPC_ENDPOINT
  ) {
    if (!fallbackServerConnection) {
      fallbackServerConnection = createConnection(SERVER_FALLBACK_RPC_ENDPOINT);
    }
    connections.push(fallbackServerConnection);
  }

  return connections;
}

export function getPrimaryClientConnection(): Connection {
  return createConnection(DEFAULT_RPC_ENDPOINT);
}

export async function withRpcFallback<T>(
  taskName: string,
  executor: (connection: Connection) => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (const connection of getServerConnections()) {
    try {
      return await executor(connection);
    } catch (error) {
      lastError = error;
      console.warn(`[vertex][rpc] ${taskName} failed on ${connection.rpcEndpoint}`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${taskName} failed across all RPC endpoints.`);
}
