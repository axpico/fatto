import { afterEach, describe, expect, it, vi } from "vitest";
import { deferCommit } from "./deferCommit";

describe("deferCommit", () => {
  afterEach(() => vi.useRealTimers());

  it("runs after the delay", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    deferCommit(run, 5000);
    vi.advanceTimersByTime(4999);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledOnce();
  });

  it("never runs once cancelled", () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const cancel = deferCommit(run, 5000);
    cancel();
    vi.advanceTimersByTime(10_000);
    expect(run).not.toHaveBeenCalled();
  });
});
