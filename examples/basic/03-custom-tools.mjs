/**
 * 示例 03: 自定义工具 — 让 Agent 执行实际操作
 *
 * 本示例演示 AgentTool 的定义与使用，这是 Agent 能"动手做事"的关键。
 *
 * AgentTool 的核心字段：
 *   name        — 工具名称（LLM 通过此名称调用工具）
 *   description — 工具描述（LLM 据此决定是否使用该工具）
 *   parameters  — 参数 schema（用 TypeBox 定义，自动校验）
 *   execute     — 执行函数，返回工具结果
 *
 * 工具执行模式：
 *   parallel   — 多个工具并发执行（默认）
 *   sequential — 逐个执行
 *
 * 运行方式：
 *   node examples/basic/03-custom-tools.mjs
 */

import { Agent } from "@earendil-works/pi-agent-core";
import { Type } from "@earendil-works/pi-ai";
import { loadModelFromConfig } from "../_shared.mjs";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

async function main() {
  const { model, apiKey } = await loadModelFromConfig("minimax", "MiniMax-M2.7");

  // ─── 1. 定义工具 ──────────────────────────────────────────────
  // TypeBox 的 Type.Object() 定义参数 schema
  // Agent 会自动校验 LLM 生成的参数，校验通过后才调用 execute

  // 工具 A: 读取文件
  const readFileTool = {
    name: "read_file",
    description: "读取指定文件的内容。参数为文件路径。",
    parameters: Type.Object({
      path: Type.String({ description: "要读取的文件路径（相对路径或绝对路径）" }),
    }),
    execute: async (_toolCallId, params) => {
      const content = readFileSync(params.path, "utf-8");
      return {
        content: [{ type: "text", text: content }],
        details: { path: params.path, size: content.length },
      };
    },
  };

  // 工具 B: 写入文件
  const writeFileTool = {
    name: "write_file",
    description: "将内容写入指定文件。如果文件已存在则覆盖。",
    parameters: Type.Object({
      path: Type.String({ description: "要写入的文件路径" }),
      content: Type.String({ description: "要写入的文件内容" }),
    }),
    execute: async (_toolCallId, params) => {
      writeFileSync(params.path, params.content, "utf-8");
      return {
        content: [{ type: "text", text: `文件已写入: ${params.path} (${params.content.length} 字符)` }],
        details: { path: params.path },
      };
    },
  };

  // 工具 C: 列出目录内容
  const listDirTool = {
    name: "list_dir",
    description: "列出指定目录下的文件和文件夹。",
    parameters: Type.Object({
      path: Type.Optional(Type.String({ description: "目录路径，默认为当前目录" })),
    }),
    execute: async (_toolCallId, params) => {
      const dir = params.path || ".";
      const entries = readdirSync(dir, { withFileTypes: true });
      const lines = entries.map((e) => {
        const type = e.isDirectory() ? "[DIR]" : "[FILE]";
        const size = e.isFile() ? ` (${statSync(join(dir, e.name)).size} bytes)` : "";
        return `${type} ${e.name}${size}`;
      });
      return {
        content: [{ type: "text", text: lines.join("\n") || "(空目录)" }],
        details: { count: entries.length },
      };
    },
  };

  // 工具 D: 计算（演示错误处理）
  const calculateTool = {
    name: "calculate",
    description: "执行简单的数学计算。支持加减乘除。",
    parameters: Type.Object({
      expression: Type.String({ description: "数学表达式，如 '1 + 2 * 3'" }),
    }),
    execute: async (_toolCallId, params) => {
      // 注意：工具中抛出的错误会被 Agent 捕获并报告给 LLM
      // 不要把错误作为 content 返回，而是直接 throw
      const expr = params.expression;
      if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
        throw new Error(`不支持的表达式: ${expr}（只支持数字和加减乘除）`);
      }
      const result = eval(expr); // 仅用于演示，生产环境请用安全的计算库
      return {
        content: [{ type: "text", text: String(result) }],
        details: { expression: expr, result },
      };
    },
  };

  // ─── 2. 创建 Agent ────────────────────────────────────────────
  const agent = new Agent({
    initialState: {
      systemPrompt: "你是一个文件操作助手。当用户请求文件操作时，请使用提供的工具完成任务。用中文回答。",
      model,
      tools: [readFileTool, writeFileTool, listDirTool, calculateTool],
    },
    getApiKey: async () => apiKey,
    // toolExecution: "sequential", // 可选: "parallel" (默认) 或 "sequential"
  });

  // ─── 3. 订阅事件（只关注工具执行）────────────────────────────
  const unsubscribe = agent.subscribe((event) => {
    switch (event.type) {
      case "tool_execution_start":
        console.log(`  [工具开始] ${event.toolName}(${JSON.stringify(event.args).slice(0, 100)})`);
        break;
      case "tool_execution_end": {
        const result = event.result;
        const text = result?.content
          ?.filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("")
          .slice(0, 150) || "";
        console.log(`  [工具完成] ${event.toolName}: ${text}`);
        break;
      }
      case "message_update":
        if (event.assistantMessageEvent.type === "text_delta") {
          process.stdout.write(event.assistantMessageEvent.delta);
        }
        break;
    }
  });

  // ─── 4. 让 Agent 执行任务 ─────────────────────────────────────
  console.log("=== 任务 1: 列出当前目录 ===\n");
  await agent.prompt("请列出当前目录下的文件。");
  console.log("\n");

  console.log("=== 任务 2: 创建文件并计算 ===\n");
  await agent.prompt("请创建一个 result.txt 文件，内容是 123 * 456 的计算结果。");
  console.log("\n");

  // ─── 5. 查看消息历史中的工具调用 ──────────────────────────────
  console.log("--- 消息历史（含工具调用）---");
  for (const msg of agent.state.messages) {
    if (msg.role === "assistant") {
      for (const block of msg.content) {
        if (block.type === "text") {
          console.log(`  [assistant text] ${block.text.slice(0, 80)}`);
        } else if (block.type === "toolCall") {
          console.log(`  [assistant toolCall] ${block.name}(${JSON.stringify(block.input || block.arguments || {}).slice(0, 80)})`);
        }
      }
    } else if (msg.role === "toolResult") {
      const text = msg.content?.filter((c) => c.type === "text").map((c) => c.text).join("").slice(0, 80) || "";
      console.log(`  [toolResult] ${text}`);
    } else if (msg.role === "user") {
      const text = typeof msg.content === "string" ? msg.content : "";
      console.log(`  [user] ${text.slice(0, 80)}`);
    }
  }

  unsubscribe();
  console.log("\n✅ 示例完成！");
}

main().catch(console.error);
