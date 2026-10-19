import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOL_NAMES } from "../src/server.js";
import { env, rpc } from "./harness.js";

test("tools/list registers exactly TOOL_NAMES, in order", async () => {
  const { status, msg } = await rpc(env(), "tools/list");
  assert.equal(status, 200);
  const names = msg.result.tools.map((t: any) => t.name);
  assert.deepEqual(names, [...TOOL_NAMES]);
});
