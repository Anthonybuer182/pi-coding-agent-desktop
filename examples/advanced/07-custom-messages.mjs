/**
 * 示例 07: 自定义消息类型与 transformContext
 *
 * 本示例演示 pi-agent-core 的高级消息处理：
 *   1. 自定义消息类型 — 通过 declaration merging 扩展 AgentMessage
 *   2. convertToLlm   — 将自定义消息过滤/转换为 LLM 能理解的格式
 *   3. transformContext — 在 LLM 调用前转换上下文（用于压缩、注入等）
 *
 * 消息流：
 *   AgentMessage[] → transformContext() → AgentMessage[] → convertToLlm() → Message[] → LLM
 *                    (可选，用于裁剪/注入)                  (必需，过滤自定义类型)
 *
 * 注意：此示例使用 TypeScript 的 declaration merging 特性。
 * 在 .mjs (JavaScript) 中，类型扩展只是概念性的，但运行时行为完全有效。
 *
 * 运行方式：
 *   node examples/advanced/07-custom-messages.mjs
 */

import { Agent } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { loadModelFromConfig } from "../_shared.mjs";

async function main() {
  const { model, apiKey } = await loadModelFromConfig("minimax", "MiniMax-M2.7");

  // ─── 1. 自定义消息类型 ───────────────────────────────────────
  console.log("═══ 1. 自定义消息类型 ═══\n");
  console.log("AgentMessage 支持自定义消息类型，用于 UI 展示、上下文注入等。");
  console.log("LLM 只理解 user / assistant / toolResult，自定义类型需在 convertToLlm 中过滤。\n");

  // 自定义消息类型示例：
  // - "notification": 系统通知（只在 UI 显示，不发给 LLM）
  // - "context_injection": 注入的外部上下文（发给 LLM 但不是用户消息）

  // 定义一个系统通知消息
  const notificationMsg = {
    role: "notification",
    text: "用户已切换到深色模式",
    timestamp: Date.now(),
  };

  // 定义一个上下文注入消息
  const contextInjectionMsg = {
    role: "context_injection",
    content: "当前时间: 2024-01-15 14:30:00\n用户位置: 北京",
    timestamp: Date.now(),
  };

  // ─── 2. 创建带 convertToLlm 的 Agent ─────────────────────────
  const agent = new Agent({
    initialState: {
      systemPrompt: "你是助手，用中文回答。你会收到一些系统上下文信息。",
      model,
      // 预设消息：注入上下文 + 用户消息
      messages: [
        contextInjectionMsg,  // 自定义类型：注入上下文
        notificationMsg,      // 自定义类型：系统通知
        { role: "user", content: "现在几点了？我在哪个城市？", timestamp: Date.now() },
      ],
    },
    getApiKey: async () => apiKey,

    // convertToLlm: 将 AgentMessage[] 转换为 LLM 能理解的 Message[]
    // 必须过滤掉自定义类型，只保留 user / assistant / toolResult
    convertToLlm: (messages) => {
      return messages.flatMap((m) => {
        // 标准消息直接保留
        if (m.role === "user" || m.role === "assistant" || m.role === "toolResult") {
          return [m];
        }

        // context_injection: 转换为 user 消息发给 LLM
        if (m.role === "context_injection") {
          return [{
            role: "user",
            content: `[系统上下文] ${m.content}`,
            timestamp: m.timestamp,
          }];
        }

        // notification: 过滤掉，不发给 LLM
        if (m.role === "notification") {
          return [];
        }

        // 其他未知类型：过滤掉
        return [];
      });
    },

    // transformContext: 在 convertToLlm 之前转换消息数组
    // 可选，用于：裁剪旧消息、注入外部上下文、实现压缩等
    transformContext: async (messages, _signal) => {
      // 示例：如果消息超过 10 条，裁剪最旧的消息（保留系统注入和最近 5 条）
      if (messages.length > 10) {
        const recent = messages.slice(-5);
        const injections = messages.filter((m) => m.role === "context_injection");
        return [...injections, ...recent];
      }
      return messages;
    },
  });

  // ─── 3. 订阅事件 ──────────────────────────────────────────────
  const unsubscribe = agent.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  // ─── 4. 让 Agent 基于注入的上下文回答 ─────────────────────────
  console.log("用户: 现在几点了？我在哪个城市？");
  console.log("(Agent 上下文中已注入了时间和位置信息)\n");
  console.log("助手: ");

  // 注意：因为预设 messages 中已有用户消息，这里用 continue() 让 Agent 响应
  await agent.continue();
  console.log("\n");

  // ─── 5. 添加自定义消息并继续对话 ──────────────────────────────
  console.log("=== 添加新的系统通知 ===\n");

  // 添加一个通知消息（不会被 LLM 看到）
  agent.state.messages.push({
    role: "notification",
    text: "用户切换到了英文模式",
    timestamp: Date.now(),
  });

  // 添加新的上下文注入
  agent.state.messages.push({
    role: "context_injection",
    content: "更新后的时间: 2024-01-15 15:00:00",
    timestamp: Date.now(),
  });

  // 用户继续对话
  console.log("用户: 现在几点了？");
  console.log("(上下文已更新)\n");
  console.log("助手: ");
  await agent.prompt("现在几点了？");
  console.log("\n");

  // ─── 6. 查看完整消息历史 ──────────────────────────────────────
  console.log("--- 完整消息历史 ---");
  for (const msg of agent.state.messages) {
    if (msg.role === "notification") {
      console.log(`  [notification] ${msg.text}`);
    } else if (msg.role === "context_injection") {
      console.log(`  [context_injection] ${msg.content.slice(0, 60)}`);
    } else if (msg.role === "user") {
      const text = typeof msg.content === "string" ? msg.content : "";
      console.log(`  [user] ${text.slice(0, 60)}`);
    } else if (msg.role === "assistant") {
      const text = msg.content?.filter((c) => c.type === "text").map((c) => c.text).join("") || "";
      console.log(`  [assistant] ${text.slice(0, 60)}`);
    }
  }

  unsubscribe();
  console.log("\n✅ 示例完成！");
  console.log("\n总结：");
  console.log("  自定义消息类型  — 用于 UI 展示、上下文注入等非 LLM 消息");
  console.log("  convertToLlm()  — 必需，将自定义消息过滤/转换为 LLM 格式");
  console.log("  transformContext() — 可选，在 convertToLlm 前裁剪/注入消息");
}

main().catch(console.error);
