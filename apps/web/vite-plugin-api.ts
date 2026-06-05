/**
 * Vite plugin that embeds a backend API server handling pi-coding-agent SDK calls.
 * This eliminates the need for a separate backend process during development.
 */
import type { Plugin, ViteDevServer } from 'vite';

function setupApiRoutes(server: ViteDevServer): void {
  server.middlewares.use(async (req, res, next) => {
    if (req.method !== 'POST' || !req.url?.startsWith('/api/request')) {
      return next();
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const { id, method, params } = body;

        const result = await handleRequest(server, method, params);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, result }));
      } catch (err) {
        console.error('[pi-api] Error:', err);
        let reqId = 'unknown';
        try {
          reqId = JSON.parse(Buffer.concat(chunks).toString()).id || 'unknown';
        } catch {}
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: reqId, error: { code: -1, message } }));
      }
    });
    req.on('error', (err) => {
      console.error('[pi-api] Req error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: -1, message: err.message } }));
      }
    });
  });
}

let adaptersModule: any = null;
let workspaceService: any;
let sessionService: any;
let fileService: any;
let diffService: any;
let configService: any;

async function loadAdapters(server: ViteDevServer) {
  if (adaptersModule) return;
  adaptersModule = await server.ssrLoadModule('@pi/sdk-wrapper/adapters');

  const cwd = process.cwd();
  workspaceService = adaptersModule.createRealWorkspaceService();
  sessionService = adaptersModule.createRealSessionService();
  fileService = adaptersModule.createRealFileService();
  diffService = adaptersModule.createRealDiffService();
  configService = adaptersModule.createRealConfigService(cwd);
}

async function handleRequest(server: ViteDevServer, method: string, params: any): Promise<any> {
  await loadAdapters(server);

  const [service, action] = method.split('.');
  if (!service || !action) {
    throw new Error(`Invalid method format: ${method}`);
  }

  switch (service) {
    case 'workspace':
      switch (action) {
        case 'list': return workspaceService.list();
        case 'get': return workspaceService.get(params.id);
        case 'create': return workspaceService.create(params.name, params.path);
        case 'delete': return workspaceService.delete(params.id);
        case 'update': return workspaceService.update(params.id, params.data);
      }
      break;

    case 'session':
      switch (action) {
        case 'list': return sessionService.list(params.workspaceId);
        case 'get': return sessionService.get(params.id);
        case 'create': return sessionService.create(params.workspaceId, params.title);
        case 'delete': return sessionService.delete(params.id);
        case 'archive': return sessionService.archive(params.id);
        case 'unarchive': return sessionService.unarchive(params.id);
        case 'updateTitle': return sessionService.updateTitle(params.id, params.title);
      }
      break;

    case 'chat':
      switch (action) {
        case 'sendMessage': {
          const { createRealChatService } = await server.ssrLoadModule('@pi/sdk-wrapper/adapters');
          const chatService = createRealChatService(process.cwd());
          return chatService.sendMessage(params);
        }
        case 'getMessages': {
          const { createRealChatService } = await server.ssrLoadModule('@pi/sdk-wrapper/adapters');
          const chatService = createRealChatService(process.cwd());
          return chatService.getMessages(params.sessionId, params.limit, params.offset);
        }
        case 'stopGeneration': {
          const { createRealChatService } = await server.ssrLoadModule('@pi/sdk-wrapper/adapters');
          const chatService = createRealChatService(process.cwd());
          return chatService.stopGeneration(params.sessionId);
        }
      }
      break;

    case 'file':
      switch (action) {
        case 'read': return fileService.read(params.workspaceId, params.path);
        case 'list': return fileService.list(params.workspaceId, params.dirPath);
        case 'write': return fileService.write(params.workspaceId, params.path, params.content);
      }
      break;

    case 'diff':
      switch (action) {
        case 'list': return diffService.list(params.sessionId);
        case 'get': return diffService.get(params.id);
        case 'accept': return diffService.accept(params.id);
        case 'reject': return diffService.reject(params.id);
      }
      break;

    case 'config':
      switch (action) {
        case 'get': return configService.get();
        case 'update': return configService.update(params.data);
        case 'listModels': return configService.listModels();
      }
      break;

    default:
      throw new Error(`Unknown service: ${service}`);
  }

  throw new Error(`Unknown action: ${service}.${action}`);
}

export function apiPlugin(): Plugin {
  return {
    name: 'pi-api-backend',
    configureServer(server) {
      setupApiRoutes(server);
    },
  };
}
