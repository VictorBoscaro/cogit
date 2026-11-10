import * as childProcess from "node:child_process";
import { promisify } from "node:util";

/**
 * `spawn` and `execFile` with `windowsHide: true` unless the caller says
 * otherwise. The hooks run cogit detached, and a detached process on Windows
 * has no console, so each git or claude it starts opened a console window of
 * its own: one flashed on the screen, titled with git's path, at every prompt.
 * Node leaves the option off by default; elsewhere it does nothing.
 */
const hidden = <T extends object>(options: T | undefined): T & { windowsHide: boolean } => ({
  windowsHide: true,
  ...(options ?? ({} as T)),
});

export const spawn = ((
  command: string,
  args: readonly string[],
  options?: childProcess.SpawnOptions,
) => childProcess.spawn(command, args, hidden(options))) as typeof childProcess.spawn;

/** Resolves like `promisify(execFile)` in Node: `{ stdout, stderr }`, both also on the error. */
const execFileAsync = (
  file: string,
  args: readonly string[],
  options?: childProcess.ExecFileOptions,
) =>
  new Promise<{ stdout: string | Buffer; stderr: string | Buffer }>((resolve, reject) => {
    childProcess.execFile(file, args, hidden(options), (error, stdout, stderr) => {
      if (error) reject(Object.assign(error, { stdout, stderr }));
      else resolve({ stdout, stderr });
    });
  });

export const execFile = Object.assign(
  (
    file: string,
    args: readonly string[],
    options: childProcess.ExecFileOptions | undefined,
    callback: Parameters<typeof childProcess.execFile>[3],
  ) => childProcess.execFile(file, args, hidden(options), callback),
  { [promisify.custom]: execFileAsync },
) as unknown as typeof childProcess.execFile;
