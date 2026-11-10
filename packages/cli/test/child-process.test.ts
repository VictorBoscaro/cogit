import { promisify } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => [] as unknown[]);

// Records the options each process starts with, then starts it for real.
vi.mock("node:child_process", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:child_process")>();
  const record =
    (fn: "spawn" | "execFile") =>
    (...args: unknown[]) => {
      calls.push(args[2]);
      return (real[fn] as (...a: unknown[]) => unknown)(...args);
    };
  return { ...real, spawn: record("spawn"), execFile: record("execFile") };
});

const { execFile, spawn } = await import("../src/child-process.js");

const node = process.execPath;

beforeEach(() => {
  calls.length = 0;
});

describe("child processes", () => {
  it("start with their window hidden", async () => {
    await new Promise((done) => spawn(node, ["-e", "0"], { stdio: "ignore" }).on("exit", done));
    await promisify(execFile)(node, ["-e", "0"], {});
    expect(calls).toEqual([{ windowsHide: true, stdio: "ignore" }, { windowsHide: true }]);
  });

  it("keep a windowsHide the caller sets", async () => {
    await promisify(execFile)(node, ["-e", "0"], { windowsHide: false });
    expect(calls).toEqual([{ windowsHide: false }]);
  });

  it("resolve and reject as promisify(execFile) does", async () => {
    const run = promisify(execFile);
    await expect(run(node, ["-e", "process.stdout.write('out')"])).resolves.toEqual({
      stdout: "out",
      stderr: "",
    });
    await expect(
      run(node, ["-e", "process.stderr.write('err'); process.exit(3)"]),
    ).rejects.toMatchObject({ code: 3, stdout: "", stderr: "err" });
  });
});
