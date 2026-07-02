/**
 * 示例 04: 状态管理与多轮对话
 *
 * 本示例演示 Agent 的状态管理：
 *   1. agent.state — 读写 Agent 的运行时状态
 *   2. 多轮对话 — Agent 自动维护对话历史
 *   3. 动态修改状态 — 运行中切换模型、系统提示词、思考等级
 *   4. reset() — 重置 Agent 状态
 *   5. 图片输入 — prompt() 传入图片
 *
 * AgentState 包含：
 *   systemPrompt  — 系统提示词
 *   model         — 当前模型
 *   thinkingLevel — 思考等级 (off | minimal | low | medium | high | xhigh)
 *   tools         — 工具列表
 *   messages      — 对话历史
 *   isStreaming    — 是否正在流式输出（只读）
 *   streamingMessage — 当前流式消息（只读）
 *
 * 运行方式：
 *   node examples/basic/04-state-management.mjs
 */

import { Agent } from "@earendil-works/pi-agent-core";
import { loadModelFromConfig } from "../_shared.mjs";

async function main() {
  const { model, apiKey } = await loadModelFromConfig("minimax", "MiniMax-M2.7");

  // ─── 1. 创建 Agent ────────────────────────────────────────────
  const agent = new Agent({
    initialState: {
      systemPrompt: "你是一个编程助手，用中文简洁回答。",
      model,
      thinkingLevel: "off", // 初始不开启思考
    },
    getApiKey: async () => apiKey,
  });

  // 简单的流式输出
  const unsubscribe = agent.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });

  // ─── 2. 多轮对话 ──────────────────────────────────────────────
  // Agent 自动维护 messages 数组，多轮对话只需连续调用 prompt()
  console.log("=== 第一轮 ===");
  console.log("用户: 我叫小明，我最喜欢的语言是 Rust。");
  await agent.prompt("我叫小明，我最喜欢的语言是 Rust。");
  console.log("\n");

  console.log("=== 第二轮 ===");
  console.log("用户: 我叫什么名字？");
  await agent.prompt("我叫什么名字？");
  console.log("\n");

  console.log("=== 第三轮 ===");
  console.log("用户: 我最喜欢的编程语言是什么？");
  await agent.prompt("我最喜欢的编程语言是什么？");
  console.log("\n");

  // ─── 3. 查看状态 ──────────────────────────────────────────────
  console.log("--- 当前 Agent 状态 ---");
  console.log(`  模型: ${agent.state.model?.provider}/${agent.state.model?.id}`);
  console.log(`  系统提示词: ${agent.state.systemPrompt.slice(0, 50)}...`);
  console.log(`  思考等级: ${agent.state.thinkingLevel}`);
  console.log(`  消息数量: ${agent.state.messages.length}`);
  console.log(`  正在流式: ${agent.state.isStreaming}`);

  // ─── 4. 动态修改状态 ──────────────────────────────────────────
  console.log("\n=== 修改状态后继续对话 ===\n");

  // 切换系统提示词
  agent.state.systemPrompt = "你是一个幽默的助手，回答时加入表情符号。";

  // 切换思考等级（需要模型支持 reasoning）
  agent.state.thinkingLevel = "medium";

  console.log("用户: 用一句话介绍 Rust。");
  await agent.prompt("用一句话介绍 Rust。");
  console.log("\n");

  // ─── 5. 切换模型 ──────────────────────────────────────────────
  // 可以在对话中途切换模型，Agent 会保留对话历史
  console.log("=== 切换模型 ===\n");
  try {
    const { model: newModel, apiKey: newApiKey } = await loadModelFromConfig("deepseek", "deepseek-chat");
    agent.state.model = newModel;
    // 切换 provider 后需更新 getApiKey（通过重新创建 Agent 或使用闭包变量）
    // 这里为演示简洁，直接用 continue 前手动注入
    console.log(`已切换到: ${newModel.provider}/${newModel.id}`);

    console.log("用户: 你是什么模型？");
    // 注意：切换 provider 后 apiKey 也变了，需要用新的 apiKey
    // 这里用一个临时 Agent 演示，实际项目应统一管理 apiKey
    const tempAgent = new Agent({
      initialState: {
        systemPrompt: agent.state.systemPrompt,
        model: newModel,
        messages: agent.state.messages,
      },
      getApiKey: async () => newApiKey,
    });
    tempAgent.subscribe((event) => {
      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        process.stdout.write(event.assistantMessageEvent.delta);
      }
    });
    await tempAgent.prompt("你是什么模型？");
    console.log("\n");
  } catch (err) {
    console.log(`（跳过模型切换演示：${err.message}）\n`);
  }

  // ─── 6. 图片输入 ──────────────────────────────────────────────
  console.log("=== 图片输入 ===\n");
  // prompt() 的第二个参数是图片数组
  // 支持视觉模型（Claude 3.5 Sonnet, GPT-4o, Gemini 等）
  const redPixelBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

  console.log("用户: [发送了一张图片] 这张图片是什么颜色的？");
  await agent.prompt("这张图片是什么颜色的？", [
    {
      type: "image",
      data: redPixelBase64,
      mimeType: "image/png",
    },
  ]);
  console.log("\n");

  // ─── 7. reset() 重置 ──────────────────────────────────────────
  console.log("=== reset() 重置 Agent ===\n");
  console.log(`重置前消息数: ${agent.state.messages.length}`);
  agent.reset();
  console.log(`重置后消息数: ${agent.state.messages.length}`);
  console.log("（系统提示词和模型保留，消息历史清空）");

  // ─── 8. 消息历史结构 ──────────────────────────────────────────
  console.log("\n--- 消息历史结构说明 ---");
  console.log("agent.state.messages 是 AgentMessage[] 数组");
  console.log("每条消息的 role 可能是: user | assistant | toolResult");
  console.log("assistant 消息的 content 是数组，可包含: text | toolCall | thinking 块");
  console.log("toolResult 消息的 content 是数组，包含工具执行结果");

  unsubscribe();
  console.log("\n✅ 示例完成！");
}

main().catch(console.error);
