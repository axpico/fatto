import { describe, it, expect } from "vitest";
import { rankFreeModels } from "./openrouterProvider";

function model(
  id: string,
  free: boolean,
  contextLength: number,
  created: number,
  supportedParameters: string[] = ["structured_outputs"],
) {
  return {
    id,
    pricing: { prompt: free ? "0" : "0.000001", completion: free ? "0" : "0.000002" },
    context_length: contextLength,
    created,
    supported_parameters: supportedParameters,
  };
}

describe("rankFreeModels", () => {
  it("keeps only free models", () => {
    const models = [model("paid/a", false, 100000, 1), model("free/b", true, 8000, 1)];
    expect(rankFreeModels(models)).toEqual(["free/b"]);
  });

  it("orders by context_length desc, then created desc", () => {
    const models = [
      model("free/small-old", true, 8000, 100),
      model("free/big", true, 128000, 50),
      model("free/small-new", true, 8000, 200),
    ];
    expect(rankFreeModels(models)).toEqual(["free/big", "free/small-new", "free/small-old"]);
  });

  it("drops models without structured_outputs support", () => {
    const models = [model("free/a", true, 8000, 1), model("free/b", true, 8000, 2, [])];
    expect(rankFreeModels(models)).toEqual(["free/a"]);
  });
});
