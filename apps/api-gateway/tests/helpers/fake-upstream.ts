import Fastify from 'fastify';
import type { AddressInfo } from 'node:net';
import type { HTTPMethods } from 'fastify';

export interface ReceivedRequest {
  headers: Record<string, string | string[] | undefined>;
  url: string;
}

export interface FakeRoute {
  method: HTTPMethods | HTTPMethods[];
  url: string;
  statusCode?: number;
  response?: unknown;
}

export interface FakeUpstream {
  baseUrl: string;
  received: ReceivedRequest[];
  close: () => Promise<void>;
}

/**
 * Starts a lightweight Fastify server on a random OS-assigned port.
 * Records every incoming request so tests can assert on forwarded headers.
 * Each test file gets its own instance — no port conflicts with parallel files.
 */
export const createFakeUpstream = async (routes: FakeRoute[]): Promise<FakeUpstream> => {
  const received: ReceivedRequest[] = [];
  const server = Fastify({ logger: false });

  for (const route of routes) {
    server.route({
      method: route.method,
      url: route.url,
      handler: async (request, reply) => {
        received.push({
          headers: { ...request.headers } as Record<string, string | string[] | undefined>,
          url: request.url,
        });
        return reply.status(route.statusCode ?? 200).send(route.response ?? { data: {} });
      },
    });
  }

  await server.listen({ port: 0, host: '127.0.0.1' });
  const addr = server.server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    received,
    close: () => server.close(),
  };
};
