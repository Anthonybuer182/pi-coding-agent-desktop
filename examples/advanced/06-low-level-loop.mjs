/**
 * 示例 06: 低级 API — agentLoop 与 agentLoopContinue
 *
 * 本示例演示 pi-agent-core 的低级 API，直接控制 Agent 循环。
 * 适用于需要精细控制事件流、自定义上下文转换等高级场景。
 *
 * Agent 类 vs agentLoop 的区别：
 *   Agent      — 高级封装，自动管理状态、消息历史、steering/followUp 队列
 *   agentLoop  — 低级原语，只提供事件流，状态管理由调用者负责
 *
 * agentLoop 的事件流是 async iterable，用 for-await-of 消费。
 *
 * 运行方式：
 *   node examples/advanced/06-low-level-loop.mjs
 */

import { agentLoop, agentLoopContinue } from "@earendil-works/pi-agent-core";
import { loadModelFromConfig } from "../_shared.mjs";

async function main() {
  const { model, apiKey } = await loadModelFromConfig("minimax", "MiniMax-M2.7");

  // ─── 1. 基本用法 ──────────────────────────────────────────────
  console.log("═══ 1. agentLoop 基本用法 ═══\n");

  // agentLoop 接收三个参数：
  //   prompts    — 要注入的新消息数组（通常是 [userMessage]）
  //   context    — Agent 上下文（systemPrompt, messages, tools）
  //   config     — 循环配置（model, convertToLlm, hooks 等）
  //
  // 注意：agentLoop 不会自动管理 messages 数组
  // 你需要从事件中收集消息并维护 context

  // 定义上下文
  const context = {
    systemPrompt: "你是简洁的助手，用中文回答。",
    messages: [],
    tools: [],
  };

  // 定义配置
  const config = {
    model,
    // getApiKey: 每次请求前调用，返回 apiKey 供 stream 函数使用
    getApiKey: async () => apiKey,
    // convertToLlm 是必需的 — 将 AgentMessage[] 转换为 LLM 能理解的 Message[]
    // 最简单的实现：只保留 user / assistant / toolResult 消息
    convertToLlm: (messages) =>
      messages.filter((m) =>
        ["user", "assistant", "toolResult"].includes(m.role)
      ),
    // 可选：工具执行模式
    toolExecution: "parallel",
    // 可选：工具调用前钩子（可以阻止工具执行）
    beforeToolCall: async ({ toolCall, args }) => {
      console.log(`  [beforeToolCall] ${toolCall.name}`);
      // 返回 { block: true, reason: "..." } 可以阻止执行
      return undefined;
    },
    // 可选：工具调用后钩子
    afterToolCall: async ({ toolCall, result, isError }) => {
      // 返回 { terminate: true } 可以让 Agent 在本轮工具完成后停止
      return undefined;
    },
  };

  // 用户消息
  const userMessage = {
    role: "user",
    content: "用三句话解释什么是递归。",
    timestamp: Date.now(),
  };

  // 消费事件流
  console.log("用户: 用三句话解释什么是递归。\n");
  console.log("助手: ");

  const newMessages = [];
  for await (const event of agentLoop([userMessage], context, config)) {
    switch (event.type) {
      case "agent_start":
        // console.log("[agent_start]");
        break;

      case "turn_start":
        // console.log("[turn_start]");
        break;

      case "message_start":
        // 消息开始 — 可以收集到 newMessages
        newMessages.push(event.message);
        break;

      case "message_update":
        // 流式增量 — 最常用
        if (event.assistantMessageEvent.type === "text_delta") {
          process.stdout.write(event.assistantMessageEvent.delta);
        }
        break;

      case "message_end":
        // 消息完成 — 替换 newMessages 中对应的 partial 消息
        const idx = newMessages.findIndex(
          (m) => m.timestamp === event.message.timestamp && m.role === event.message.role
        );
        if (idx >= 0) newMessages[idx] = event.message;
        else newMessages.push(event.message);
        break;

      case "tool_execution_start":
        console.log(`\n  [工具开始] ${event.toolName}`);
        break;

      case "tool_execution_end":
        console.log(`  [工具完成] ${event.toolName}`);
        break;

      case "turn_end":
        // console.log("[turn_end]");
        break;

      case "agent_end":
        // console.log("[agent_end]");
        break;
    }
  }

  console.log("\n");

  // ─── 2. 将收集的消息加入 context，实现多轮对话 ───────────────
  console.log("═══ 2. 用 agentLoop 实现多轮对话 ═══\n");

  // 把上一轮的消息加入 context
  context.messages.push(...newMessages);

  // 第二轮
  const userMessage2 = {
    role: "user",
    content: "请给一个简单的递归代码示例。",
    timestamp: Date.now(),
  };

  console.log("用户: 请给一个简单的递归代码示例。\n");
  console.log("助手: ");

  const newMessages2 = [];
  for await (const event of agentLoop([userMessage2], context, config)) {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    } else if (event.type === "message_end") {
      newMessages2.push(event.message);
    }
  }

  context.messages.push(...newMessages2);
  console.log("\n");

  // ─── 3. agentLoopContinue — 从已有上下文继续 ──────────────────
  console.log("═══ 3. agentLoopContinue ═══\n");
  console.log("agentLoopContinue 不注入新消息，从当前上下文继续。");
  console.log("用途：错误恢复、重试。\n");

  // 手动添加一条 user 消息到 context
  context.messages.push({
    role: "user",
    content: "用一句话总结上面的对话。",
    timestamp: Date.now(),
  });

  console.log("助手: ");
  for await (const event of agentLoopContinue(context, config)) {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  }

  console.log("\n");

  // ─── 4. shouldStopAfterTurn — 自定义停止逻辑 ──────────────────
  console.log("═══ 4. shouldStopAfterTurn 自定义停止 ═══\n");
  console.log("在每个 turn 结束后检查是否应该停止循环。\n");

  const configWithStop = {
    ...config,
    shouldStopAfterTurn: async ({ message, toolResults, context }) => {
      // 例如：消息超过 5 条时停止
      if (context.messages.length > 5) {
        console.log("  [shouldStopAfterTurn] 消息过多，停止循环");
        return true;
      }
      return false;
    },
  };

  console.log("✅ 示例完成！");
  console.log("\n总结：");
  console.log("  agentLoop(prompts, context, config) — 启动循环，注入新消息");
  console.log("  agentLoopContinue(context, config)   — 从现有上下文继续");
  console.log("  shouldStopAfterTurn                  — 自定义停止逻辑");
  console.log("  beforeToolCall / afterToolCall        — 工具钩子");
  console.log("  convertToLlm                         — 消息转换（必需）");
}

main().catch(console.error);
