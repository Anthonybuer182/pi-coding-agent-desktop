/**
 * 共享模块 — 从 ~/.pi/agent/models.json 加载自定义模型配置
 *
 * 为什么需要这个模块？
 *   pi-ai 的 getModel() 只读取内置模型注册表（硬编码在 models.generated.js），
 *   不会加载 ~/.pi/agent/models.json 里的自定义 provider/模型配置。
 *   只有 pi CLI（pi-coding-agent 包）启动时才会读 models.json。
 *
 *   示例代码用的是更底层的 pi-ai / pi-agent-core，所以要手动读取 models.json
 *   并构造 Model 对象 + 注入 apiKey。
 *
 * 用法：
 *   import { loadModelFromConfig } from "../_shared.mjs";
 *   const { model, apiKey } = await loadModelFromConfig("minimax", "MiniMax-M2.7");
 *   const agent = new Agent({
 *     initialState: { systemPrompt: "...", model },
 *     getApiKey: async () => apiKey,
 *   });
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * 从 ~/.pi/agent/models.json 读取自定义模型配置并构造 Model 对象。
 *
 * @param {string} providerName - provider 名称（如 "minimax"、"deepseek"）
 * @param {string} modelId - 模型 ID（如 "MiniMax-M2.7"）
 * @returns {Promise<{ model: object, apiKey: string }>}
 */
export async function loadModelFromConfig(providerName, modelId) {
  const modelsJsonPath = path.join(os.homedir(), ".pi", "agent", "models.json");

  if (!fs.existsSync(modelsJsonPath)) {
    throw new Error(
      `找不到配置文件: ${modelsJsonPath}\n` +
      `请先创建 ~/.pi/agent/models.json，格式参考 pi 文档。\n` +
      `或者改用内置模型: import { getModel } from "@earendil-works/pi-ai"`
    );
  }

  const modelsConfig = JSON.parse(fs.readFileSync(modelsJsonPath, "utf8"));
  const providerConfig = modelsConfig.providers?.[providerName];
  const modelConfig = providerConfig?.models?.find((m) => m.id === modelId);

  if (!providerConfig || !modelConfig) {
    const available = Object.keys(modelsConfig.providers ?? {}).join(", ");
    throw new Error(
      `在 ${modelsJsonPath} 中找不到 ${providerName}/${modelId}\n` +
      `可用的 providers: ${available || "(无)"}`
    );
  }

  const apiKey = providerConfig.apiKey;
  if (!apiKey) {
    throw new Error(`${providerName} 未配置 apiKey`);
  }

  // 构造 Model 对象（字段参考 @earendil-works/pi-ai 的 Model 接口）
  const model = {
    id: modelConfig.id,
    name: modelConfig.name ?? modelConfig.id,
    api: providerConfig.api,
    provider: providerName,
    baseUrl: providerConfig.baseUrl,
    reasoning: modelConfig.reasoning ?? false,
    input: modelConfig.input ?? ["text"],
    cost: modelConfig.cost ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: modelConfig.contextWindow ?? 128000,
    maxTokens: modelConfig.maxTokens ?? 16384,
    ...(providerConfig.compat ? { compat: providerConfig.compat } : {}),
  };

  return { model, apiKey };
}
