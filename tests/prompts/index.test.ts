import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerPrompts } from "../../src/prompts/index.js";

async function connectedClient(): Promise<Client> {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  registerPrompts(server);

  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), server.server.connect(serverTransport)]);
  return client;
}

function messageText(result: Awaited<ReturnType<Client["getPrompt"]>>): string {
  return result.messages.map((m) => (m.content.type === "text" ? m.content.text : "")).join("\n");
}

describe("registerPrompts", () => {
  it("registers all six prompts by name", async () => {
    const client = await connectedClient();
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name).sort();
    expect(names).toEqual(
      [
        "debug-crash",
        "install-and-test-apk",
        "performance-check",
        "release-preflight",
        "setup-emulator",
        "ui-inspect",
      ].sort(),
    );
  });

  it("debug-crash guides toward app_launch and logcat_read with the package name", async () => {
    const client = await connectedClient();
    const result = await client.getPrompt({
      name: "debug-crash",
      arguments: { packageName: "com.example.app" },
    });
    const text = messageText(result);
    expect(text).toContain("app_launch");
    expect(text).toContain("logcat_read");
    expect(text).toContain("com.example.app");
  });

  it("setup-emulator guides toward sdk_install, avd_create, and emulator_start", async () => {
    const client = await connectedClient();
    const result = await client.getPrompt({ name: "setup-emulator", arguments: {} });
    const text = messageText(result);
    expect(text).toContain("sdk_list");
    expect(text).toContain("sdk_install");
    expect(text).toContain("avd_create");
    expect(text).toContain("emulator_start");
  });

  it("install-and-test-apk guides toward apk_analyze, apk_install, app_launch, logcat_read", async () => {
    const client = await connectedClient();
    const result = await client.getPrompt({
      name: "install-and-test-apk",
      arguments: { apkPath: "/tmp/app.apk" },
    });
    const text = messageText(result);
    expect(text).toContain("apk_analyze");
    expect(text).toContain("apk_install");
    expect(text).toContain("app_launch");
    expect(text).toContain("logcat_read");
    expect(text).toContain("/tmp/app.apk");
  });

  it("ui-inspect guides toward ui_dump and device_screenshot", async () => {
    const client = await connectedClient();
    const result = await client.getPrompt({ name: "ui-inspect", arguments: {} });
    const text = messageText(result);
    expect(text).toContain("ui_dump");
    expect(text).toContain("device_screenshot");
  });

  it("performance-check guides toward gradle_build, apk_analyze, and logcat_read", async () => {
    const client = await connectedClient();
    const result = await client.getPrompt({
      name: "performance-check",
      arguments: { packageName: "com.example.app" },
    });
    const text = messageText(result);
    expect(text).toContain("gradle_build");
    expect(text).toContain("apk_analyze");
    expect(text).toContain("logcat_read");
  });

  it("release-preflight guides toward gradle_clean, gradle_build, lint_run, apk_analyze", async () => {
    const client = await connectedClient();
    const result = await client.getPrompt({ name: "release-preflight", arguments: {} });
    const text = messageText(result);
    expect(text).toContain("gradle_clean");
    expect(text).toContain("gradle_build");
    expect(text).toContain("lint_run");
    expect(text).toContain("apk_analyze");
  });
});
