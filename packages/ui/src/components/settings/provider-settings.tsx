import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, EyeOff, AlertCircle, Loader2, EyeIcon, FileText } from 'lucide-react';
import { useSDK } from '@/hooks/use-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ModelsConfig, ProviderEntry, ModelEntry } from '@pi/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DEFAULT_PROVIDER: ProviderEntry = {
  baseUrl: 'https://api.example.com/v1',
  api: 'openai-completions',
  apiKey: '',
  compat: { supportsDeveloperRole: false, supportsReasoningEffort: false },
  models: [],
};

const DEFAULT_MODEL: ModelEntry = {
  id: '',
  name: '',
  input: ['text'],
};

/** 判断模型输入类型：纯文本语言模型 或 多模态视觉模型 */
function getModelInputType(model: ModelEntry): 'text' | 'multimodal' {
  const input = model.input ?? [];
  if (input.includes('image')) return 'multimodal';
  return 'text';
}

export function ProviderSettings() {
  const sdk = useSDK();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // 删除确认
  const [deleteProvider, setDeleteProvider] = useState<string | null>(null);
  const [deleteModel, setDeleteModel] = useState<{ provider: string; modelId: string } | null>(null);

  // 添加/编辑供应商对话框
  const [providerDialog, setProviderDialog] = useState<{
    open: boolean;
    name: string;
    data: ProviderEntry;
  }>({ open: false, name: '', data: { ...DEFAULT_PROVIDER } });

  // 添加/编辑模型对话框
  const [modelDialog, setModelDialog] = useState<{
    open: boolean;
    providerName: string;
    editMode: boolean;
    originalId: string;
    data: ModelEntry;
  }>({ open: false, providerName: '', editMode: false, originalId: '', data: { ...DEFAULT_MODEL } });

  const { data: config, isLoading, refetch } = useQuery({
    queryKey: ['modelsConfig'],
    queryFn: () => sdk.config.getModelsConfig(),
  });

  const providers = config?.providers ?? {};

  const toggleKeyVisibility = useCallback((name: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // --- 供应商操作 ---

  const handleAddProvider = useCallback(() => {
    setProviderDialog({ open: true, name: '', data: { ...DEFAULT_PROVIDER } });
  }, []);

  const handleEditProvider = useCallback((name: string) => {
    const p = providers[name];
    if (!p) return;
    setProviderDialog({
      open: true,
      name,
      data: { ...p, models: [...p.models], compat: { ...p.compat } },
    });
  }, [providers]);

  const handleSaveProvider = useCallback(async () => {
    try {
      setError(null);
      const { name, data } = providerDialog;
      if (!name.trim() || !data.baseUrl.trim() || !data.apiKey.trim()) {
        setError('请填写所有必填字段（名称、Base URL、API Key）');
        return;
      }
      await sdk.config.upsertProvider(name.trim(), data);
      setProviderDialog({ open: false, name: '', data: { ...DEFAULT_PROVIDER } });
      queryClient.invalidateQueries({ queryKey: ['modelsConfig'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
  }, [providerDialog, sdk, queryClient]);

  const handleConfirmDeleteProvider = useCallback(async () => {
    if (!deleteProvider) return;
    try {
      await sdk.config.deleteProvider(deleteProvider);
      setDeleteProvider(null);
      queryClient.invalidateQueries({ queryKey: ['modelsConfig'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  }, [deleteProvider, sdk, queryClient]);

  // --- 模型操作 ---

  const handleAddModel = useCallback((providerName: string) => {
    setModelDialog({
      open: true,
      providerName,
      editMode: false,
      originalId: '',
      data: { ...DEFAULT_MODEL },
    });
  }, []);

  const handleEditModel = useCallback((providerName: string, model: ModelEntry) => {
    setModelDialog({
      open: true,
      providerName,
      editMode: true,
      originalId: model.id,
      data: { ...model },
    });
  }, []);

  const handleSaveModel = useCallback(async () => {
    try {
      setError(null);
      const { providerName, editMode, originalId, data } = modelDialog;
      if (!data.id.trim() || !data.name.trim()) {
        setError('请填写模型 ID 和名称');
        return;
      }
      if (editMode) {
        await sdk.config.updateModel(providerName, originalId, data);
      } else {
        await sdk.config.addModel(providerName, data);
      }
      setModelDialog({ open: false, providerName: '', editMode: false, originalId: '', data: { ...DEFAULT_MODEL } });
      queryClient.invalidateQueries({ queryKey: ['modelsConfig'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
  }, [modelDialog, sdk, queryClient]);

  const handleConfirmDeleteModel = useCallback(async () => {
    if (!deleteModel) return;
    try {
      await sdk.config.deleteModel(deleteModel.provider, deleteModel.modelId);
      setDeleteModel(null);
      queryClient.invalidateQueries({ queryKey: ['modelsConfig'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  }, [deleteModel, sdk, queryClient]);

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '****' + key.slice(-4);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h3 className="text-sm font-semibold">模型供应商配置</h3>
          <p className="text-xs text-muted-foreground">
            管理 ~/.pi/agent/models.json 中的供应商和模型
          </p>
        </div>
        <Button size="sm" onClick={handleAddProvider}>
          <Plus className="h-4 w-4 mr-1" />
          添加供应商
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-6 px-2" onClick={() => setError(null)}>
            &times;
          </Button>
        </div>
      )}

      {/* 供应商列表 */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4">
          {Object.keys(providers).length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">暂无供应商配置</p>
              <p className="text-xs mt-1">点击"添加供应商"创建第一个供应商</p>
            </div>
          )}
          {Object.entries(providers).map(([name, provider]) => (
            <Card key={name} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{name}</CardTitle>
                    <Badge variant="secondary" className="text-[10px]">{provider.api}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditProvider(name)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteProvider(name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs space-y-0.5">
                  <div>URL: {provider.baseUrl}</div>
                  <div className="flex items-center gap-1">
                    <span>Key:</span>
                    <code className="text-[10px] bg-muted px-1 rounded">
                      {visibleKeys.has(name) ? provider.apiKey : maskApiKey(provider.apiKey)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => toggleKeyVisibility(name)}
                    >
                      {visibleKeys.has(name) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3 pt-0">
                <Separator className="mb-2" />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    模型 ({provider.models.length})
                  </span>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAddModel(name)}>
                    <Plus className="h-3 w-3 mr-1" />添加模型
                  </Button>
                </div>
                {provider.models.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">暂无模型</p>
                ) : (
                  <div className="space-y-1">
                    {provider.models.map((model) => {
                      const inputType = getModelInputType(model);
                      return (
                      <div key={model.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{model.name}</span>
                          <code className="text-[10px] text-muted-foreground truncate">{model.id}</code>
                          {inputType === 'multimodal' ? (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              <EyeIcon className="h-2.5 w-2.5 mr-0.5" />
                              视觉
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-muted-foreground">
                              <FileText className="h-2.5 w-2.5 mr-0.5" />
                              文本
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditModel(name, model)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteModel({ provider: name, modelId: model.id })}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* 供应商对话框 */}
      <Dialog open={providerDialog.open} onOpenChange={(open) => !open && setProviderDialog({ open: false, name: '', data: { ...DEFAULT_PROVIDER } })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{providerDialog.name ? '编辑供应商' : '添加供应商'}</DialogTitle>
            <DialogDescription>
              {providerDialog.name ? `修改 ${providerDialog.name} 的配置` : '添加一个新的模型供应商'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!providerDialog.name && (
              <div>
                <Label htmlFor="providerName">名称 *</Label>
                <Input
                  id="providerName"
                  placeholder="例如: minimax, openai, dashscope"
                  value={providerDialog.name ? undefined : ''}
                  onChange={(e) => setProviderDialog((d) => ({ ...d, name: e.target.value }))}
                />
              </div>
            )}
            <div>
              <Label htmlFor="providerBaseUrl">Base URL *</Label>
              <Input
                id="providerBaseUrl"
                placeholder="https://api.example.com/v1"
                value={providerDialog.data.baseUrl}
                onChange={(e) => setProviderDialog((d) => ({ ...d, data: { ...d.data, baseUrl: e.target.value } }))}
              />
            </div>
            <div>
              <Label htmlFor="providerApi">API 类型 *</Label>
              <Input
                id="providerApi"
                placeholder="openai-completions"
                value={providerDialog.data.api}
                onChange={(e) => setProviderDialog((d) => ({ ...d, data: { ...d.data, api: e.target.value } }))}
              />
            </div>
            <div>
              <Label htmlFor="providerApiKey">API Key *</Label>
              <Input
                id="providerApiKey"
                type="password"
                placeholder="sk-..."
                value={providerDialog.data.apiKey}
                onChange={(e) => setProviderDialog((d) => ({ ...d, data: { ...d.data, apiKey: e.target.value } }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderDialog({ open: false, name: '', data: { ...DEFAULT_PROVIDER } })}>
              取消
            </Button>
            <Button onClick={handleSaveProvider}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模型对话框 */}
      <Dialog open={modelDialog.open} onOpenChange={(open) => !open && setModelDialog({ open: false, providerName: '', editMode: false, originalId: '', data: { ...DEFAULT_MODEL } })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{modelDialog.editMode ? '编辑模型' : '添加模型'}</DialogTitle>
            <DialogDescription>
              供应商: {modelDialog.providerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="modelId">模型 ID *</Label>
              <Input
                id="modelId"
                placeholder="MiniMax-M2.7-highspeed"
                value={modelDialog.data.id}
                disabled={modelDialog.editMode}
                onChange={(e) => setModelDialog((d) => ({ ...d, data: { ...d.data, id: e.target.value } }))}
              />
            </div>
            <div>
              <Label htmlFor="modelName">模型名称 *</Label>
              <Input
                id="modelName"
                placeholder="MiniMax-M2.7-highspeed"
                value={modelDialog.data.name}
                onChange={(e) => setModelDialog((d) => ({ ...d, data: { ...d.data, name: e.target.value } }))}
              />
            </div>
            <div>
              <Label htmlFor="modelInput">模型类型</Label>
              <Select
                value={getModelInputType(modelDialog.data) === 'multimodal' ? 'multimodal' : 'text'}
                onValueChange={(value: string) =>
                  setModelDialog((d) => ({
                    ...d,
                    data: { ...d.data, input: value === 'multimodal' ? ['text', 'image'] : ['text'] },
                  }))
                }
              >
                <SelectTrigger id="modelInput">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      <span>纯文本语言模型</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="multimodal">
                    <div className="flex items-center gap-2">
                      <EyeIcon className="h-3.5 w-3.5" />
                      <span>多模态视觉模型</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                视觉模型可接收图像输入，语言模型仅接收文本
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelDialog({ open: false, providerName: '', editMode: false, originalId: '', data: { ...DEFAULT_MODEL } })}>
              取消
            </Button>
            <Button onClick={handleSaveModel}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除供应商确认 */}
      <AlertDialog open={!!deleteProvider} onOpenChange={(open: boolean) => !open && setDeleteProvider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除供应商</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除供应商 "{deleteProvider}" 吗？该供应商下的所有模型配置将被一同删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteProvider} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除模型确认 */}
      <AlertDialog open={!!deleteModel} onOpenChange={(open: boolean) => !open && setDeleteModel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除模型</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除模型 "{deleteModel?.modelId}" 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteModel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
