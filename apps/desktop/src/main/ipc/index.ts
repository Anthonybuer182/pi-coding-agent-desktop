import { ipcMain, dialog } from 'electron';
import {
  createRealWorkspaceService,
  createRealSessionService,
  createRealFileService,
  createRealDiffService,
  createRealConfigService,
} from '@pi/sdk-wrapper/adapters';
import type { WorkspaceService, SessionService, FileService, DiffService, ConfigService, SendMessageParams } from '@pi/sdk-wrapper';

const workspaceService: WorkspaceService = createRealWorkspaceService();
const sessionService: SessionService = createRealSessionService();
const fileService: FileService = createRealFileService();
const diffService: DiffService = createRealDiffService();
const configService: ConfigService = createRealConfigService(process.cwd());

interface SdkRequest {
  id: string;
  method: string;
  params: unknown;
}

export function registerIpcHandlers(): void {
  ipcMain.handle('pi:sdk:request', async (_event, request: SdkRequest) => {
    const { id, method, params } = request;
    try {
      const result = await routeRequest(method, params);
      return { id, result };
    } catch (error) {
      return {
        id,
        error: {
          code: -1,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  });
}

async function routeRequest(method: string, params: unknown): Promise<unknown> {
  const [service, action] = method.split('.');
  if (!service || !action) {
    throw new Error(`Invalid method format: ${method}`);
  }

  switch (service) {
    case 'workspace': return handleWorkspace(action, params);
    case 'session': return handleSession(action, params);
    case 'chat': return handleChat(action, params);
    case 'file': return handleFile(action, params);
    case 'diff': return handleDiff(action, params);
    case 'config': return handleConfig(action, params);
    case 'system': return handleSystem(action);
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}

async function handleWorkspace(action: string, params: unknown): Promise<unknown> {
  const p = params as Record<string, unknown>;
  switch (action) {
    case 'list': return workspaceService.list();
    case 'get': return workspaceService.get(p.id as string);
    case 'create': return workspaceService.create(p.name as string, p.path as string);
    case 'delete': return workspaceService.delete(p.id as string);
    case 'update': return workspaceService.update(p.id as string, p.data as Record<string, unknown>);
    default: throw new Error(`Unknown workspace action: ${action}`);
  }
}

async function handleSession(action: string, params: unknown): Promise<unknown> {
  const p = params as Record<string, unknown>;
  switch (action) {
    case 'list': return sessionService.list(p.workspaceId as string);
    case 'get': return sessionService.get(p.id as string);
    case 'create': return sessionService.create(p.workspaceId as string, p.title as string | undefined);
    case 'delete': return sessionService.delete(p.id as string);
    case 'archive': return sessionService.archive(p.id as string);
    case 'unarchive': return sessionService.unarchive(p.id as string);
    case 'updateTitle': return sessionService.updateTitle(p.id as string, p.title as string);
    case 'getTree': return sessionService.getTree(p.id as string);
    default: throw new Error(`Unknown session action: ${action}`);
  }
}

async function handleChat(action: string, params: unknown): Promise<unknown> {
  const p = params as Record<string, unknown>;
  switch (action) {
    case 'sendMessage': {
      const { createRealChatService } = await import('@pi/sdk-wrapper/adapters');
      const chatService = createRealChatService(process.cwd());
      return chatService.sendMessage(p as unknown as SendMessageParams);
    }
    case 'getMessages': {
      const { createRealChatService } = await import('@pi/sdk-wrapper/adapters');
      const chatService = createRealChatService(process.cwd());
      return chatService.getMessages(p.sessionId as string, p.limit as number | undefined, p.offset as number | undefined);
    }
    case 'stopGeneration': {
      const { createRealChatService } = await import('@pi/sdk-wrapper/adapters');
      const chatService = createRealChatService(process.cwd());
      return chatService.stopGeneration(p.sessionId as string);
    }
    case 'steer': {
      const { createRealChatService } = await import('@pi/sdk-wrapper/adapters');
      const chatService = createRealChatService(process.cwd());
      return chatService.steer(p.sessionId as string, p.content as string, p.images as any);
    }
    case 'followUp': {
      const { createRealChatService } = await import('@pi/sdk-wrapper/adapters');
      const chatService = createRealChatService(process.cwd());
      return chatService.followUp(p.sessionId as string, p.content as string, p.images as any);
    }
    default: throw new Error(`Unknown chat action: ${action}`);
  }
}

async function handleFile(action: string, params: unknown): Promise<unknown> {
  const p = params as Record<string, unknown>;
  switch (action) {
    case 'read': return fileService.read(p.workspaceId as string, p.path as string);
    case 'list': return fileService.list(p.workspaceId as string, (p.directory ?? p.dirPath) as string | undefined);
    case 'write': return fileService.write(p.workspaceId as string, p.path as string, p.content as string);
    default: throw new Error(`Unknown file action: ${action}`);
  }
}

async function handleDiff(action: string, params: unknown): Promise<unknown> {
  const p = params as Record<string, unknown>;
  switch (action) {
    case 'list': return diffService.list(p.sessionId as string);
    case 'get': return diffService.get(p.id as string);
    case 'accept': return diffService.accept(p.id as string);
    case 'reject': return diffService.reject(p.id as string);
    default: throw new Error(`Unknown diff action: ${action}`);
  }
}

async function handleConfig(action: string, params: unknown): Promise<unknown> {
  const p = params as Record<string, unknown>;
  switch (action) {
    case 'get': return configService.get();
    case 'update': return configService.update(p.data as any);
    case 'listModels': return configService.listModels();
    case 'getModelsConfig': return configService.getModelsConfig();
    case 'saveModelsConfig': return configService.saveModelsConfig(p.config as any);
    case 'upsertProvider': return configService.upsertProvider(p.name as string, p.provider as any);
    case 'deleteProvider': return configService.deleteProvider(p.name as string);
    case 'addModel': return configService.addModel(p.providerName as string, p.model as any);
    case 'deleteModel': return configService.deleteModel(p.providerName as string, p.modelId as string);
    case 'updateModel': return configService.updateModel(p.providerName as string, p.modelId as string, p.model as any);
    default: throw new Error(`Unknown config action: ${action}`);
  }
}

async function handleSystem(action: string): Promise<unknown> {
  switch (action) {
    case 'selectDirectory': {
      const result = await dialog.showOpenDialog({
        title: 'Select workspace folder',
        properties: ['openDirectory', 'createDirectory'],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      return result.filePaths[0];
    }
    default: throw new Error(`Unknown system action: ${action}`);
  }
}
