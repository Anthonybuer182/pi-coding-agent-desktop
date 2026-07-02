# @earendil-works/pi-agent-core 示例教程

本目录包含 7 个渐进式示例，教你如何使用 `@earendil-works/pi-agent-core` 核心库。

`pi-agent-core` 是一个通用的有状态 Agent 框架，提供工具执行、事件流、状态管理等功能，构建在 `@earendil-works/pi-ai` 之上。

## 目录结构

```
examples/
├── basic/          ← 基础篇：Agent 创建、事件流、工具、状态管理
│   ├── 01-basic-agent.mjs
│   ├── 02-event-streaming.mjs
│   ├── 03-custom-tools.mjs
│   └── 04-state-management.mjs
├── advanced/       ← 进阶篇：控制流、低级 API、自定义消息
│   ├── 05-steering-followup.mjs
│   ├── 06-low-level-loop.mjs
│   └── 07-custom-messages.mjs
└── README.md
```

## 前置准备

### 1. 安装依赖

`pi-agent-core` 是 `pi-coding-agent` 的依赖，在本项目 pnpm workspace 中已存在：

```bash
cd /Users/simba/AI/pi-coding-agent-desktop
pnpm install
```

### 2. 配置 API Key

示例通过 `~/.pi/agent/models.json` 读取自定义 provider 配置（封装在 [_shared.mjs](./_shared.mjs) 的 `loadModelFromConfig()` 中）。

请编辑 `~/.pi/agent/models.json`，配置至少一个 provider：

```json
{
  "providers": {
    "minimax": {
      "baseUrl": "https://api.minimaxi.com/v1",
      "api": "openai-completions",
      "apiKey": "你的-API-Key",
      "compat": {
        "supportsDeveloperRole": false,
        "supportsReasoningEffort": false
      },
      "models": [
        { "id": "MiniMax-M2.7", "name": "MiniMax-M2.7", "input": ["text"] }
      ]
    }
  }
}
```

> **注意**：`@earendil-works/pi-ai` 的 `getModel()` 只读内置模型注册表，不会加载 `models.json`。`pi` CLI 启动时才会读 `models.json`。示例代码用的是更底层的 `pi-ai` / `pi-agent-core`，所以通过 `loadModelFromConfig()` 手动读取配置。

### 3. 运行示例

```bash
# 基础篇
node examples/basic/01-basic-agent.mjs
node examples/basic/02-event-streaming.mjs
node examples/basic/03-custom-tools.mjs
node examples/basic/04-state-management.mjs

# 进阶篇
node examples/advanced/05-steering-followup.mjs
node examples/advanced/06-low-level-loop.mjs
node examples/advanced/07-custom-messages.mjs
```

## 基础篇 (`basic/`)

掌握 Agent 类的核心用法，从零开始构建可交互的 Agent。

| 文件 | 主题 | 核心 API |
|------|------|----------|
| [01-basic-agent.mjs](./basic/01-basic-agent.mjs) | Agent 基础：创建与单轮对话 | `new Agent()`, `agent.prompt()`, `agent.state` |
| [02-event-streaming.mjs](./basic/02-event-streaming.mjs) | 事件订阅与流式输出 | `agent.subscribe()`, 事件类型 (text_delta, tool_execution_*) |
| [03-custom-tools.mjs](./basic/03-custom-tools.mjs) | 自定义工具 | `AgentTool`, `Type.Object()`, `execute()`, 错误处理 |
| [04-state-management.mjs](./basic/04-state-management.mjs) | 状态管理与多轮对话 | `agent.state`, 动态修改 systemPrompt/model/thinkingLevel, 图片输入, `reset()` |

## 进阶篇 (`advanced/`)

深入 Agent 的高级控制流、低级 API 和消息定制。

| 文件 | 主题 | 核心 API |
|------|------|----------|
| [05-steering-followup.mjs](./advanced/05-steering-followup.mjs) | 转向、追加、中断与重试 | `agent.steer()`, `.followUp()`, `.abort()`, `.continue()`, `.waitForIdle()` |
| [06-low-level-loop.mjs](./advanced/06-low-level-loop.mjs) | 低级 API | `agentLoop()`, `agentLoopContinue()`, `shouldStopAfterTurn` |
| [07-custom-messages.mjs](./advanced/07-custom-messages.mjs) | 自定义消息类型 | declaration merging, `convertToLlm()`, `transformContext()` |

## 核心概念

### 架构

```
@earendil-works/pi-ai          ← 统一 LLM API (getModel, stream, complete)
        ↓
@earendil-works/pi-agent-core  ← Agent 框架 (Agent, agentLoop, tools, events)
        ↓
@earendil-works/pi-coding-agent ← 编码 Agent (SessionManager, ModelRegistry, Skills)
```

### 消息流

```
AgentMessage[] → transformContext() → AgentMessage[] → convertToLlm() → Message[] → LLM
                  (可选：裁剪/注入)                    (必需：过滤自定义类型)
```

### 事件流

```
prompt("Hello")
├─ agent_start
├─ turn_start
├─ message_start   { message: userMessage }
├─ message_end     { message: userMessage }
├─ message_start   { message: assistantMessage }
├─ message_update  { assistantMessageEvent: { type: "text_delta", delta } }  ← 流式文本
├─ message_update  ...
├─ message_end     { message: assistantMessage }
├─ turn_end        { message, toolResults: [] }
└─ agent_end       { messages: [...] }
```

### 最小可运行代码

```javascript
import { Agent } from "@earendil-works/pi-agent-core";
import { loadModelFromConfig } from "../_shared.mjs";

const { model, apiKey } = await loadModelFromConfig("minimax", "MiniMax-M2.7");

const agent = new Agent({
  initialState: {
    systemPrompt: "You are a helpful assistant.",
    model,
  },
  getApiKey: async () => apiKey,
});

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("Hello!");
```

## API 速查

### Agent 方法

| 方法 | 说明 |
|------|------|
| `agent.prompt(text, images?)` | 发送消息，阻塞直到完成 |
| `agent.continue()` | 从当前状态继续（不添加新消息） |
| `agent.subscribe(callback)` | 订阅事件，返回 unsubscribe 函数 |
| `agent.abort()` | 中断当前操作 |
| `agent.waitForIdle()` | 等待 Agent 完全空闲 |
| `agent.reset()` | 清空消息历史（保留 systemPrompt 和 model） |
| `agent.steer(message)` | 转向：运行中插入指令 |
| `agent.followUp(message)` | 追加：完成后自动执行后续任务 |
| `agent.clearAllQueues()` | 清空 steering 和 followUp 队列 |

### Agent 状态 (`agent.state`)

| 属性 | 说明 |
|------|------|
| `systemPrompt` | 系统提示词（可读写） |
| `model` | 当前模型（可读写） |
| `thinkingLevel` | 思考等级: off / minimal / low / medium / high / xhigh |
| `tools` | 工具列表（可读写） |
| `messages` | 对话历史 AgentMessage[]（可读写） |
| `isStreaming` | 是否正在流式输出（只读） |
| `streamingMessage` | 当前流式消息（只读） |

### 事件类型

| 事件 | 说明 | 关键字段 |
|------|------|----------|
| `agent_start` | Agent 开始处理 | - |
| `agent_end` | Agent 完全结束 | `messages` |
| `turn_start` | 新轮次开始 | - |
| `turn_end` | 轮次结束 | `message`, `toolResults` |
| `message_start` | 消息开始 | `message` |
| `message_update` | 消息更新（仅 assistant） | `assistantMessageEvent` |
| `message_end` | 消息完成 | `message` |
| `tool_execution_start` | 工具开始 | `toolName`, `args` |
| `tool_execution_update` | 工具进度 | `partialResult` |
| `tool_execution_end` | 工具完成 | `result` |

### AgentTool 结构

```javascript
const myTool = {
  name: "tool_name",           // LLM 调用时的名称
  description: "做什么的",      // LLM 据此决定是否使用
  parameters: Type.Object({    // TypeBox schema，自动校验
    key: Type.String(),
  }),
  execute: async (toolCallId, params, signal, onUpdate) => {
    // 执行逻辑
    return {
      content: [{ type: "text", text: "结果" }],
      // terminate: true,  // 可选：提示 Agent 停止
    };
  },
  // executionMode: "sequential",  // 可选：覆盖全局执行模式
};
```

### 低级 API

```javascript
import { agentLoop, agentLoopContinue } from "@earendil-works/pi-agent-core";

// 启动循环
for await (const event of agentLoop([userMessage], context, config)) {
  console.log(event.type);
}

// 从现有上下文继续
for await (const event of agentLoopContinue(context, config)) {
  console.log(event.type);
}
```
