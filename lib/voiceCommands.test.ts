import { describe, it, expect } from "vitest";
import { matchVoiceCommand } from "./voiceCommands";

describe("matchVoiceCommand", () => {
  it("recognizes next/prev/timer commands, case-insensitive", () => {
    expect(matchVoiceCommand("Avanti")).toEqual({ type: "next" });
    expect(matchVoiceCommand("prossimo passaggio")).toEqual({ type: "next" });
    expect(matchVoiceCommand("Indietro")).toEqual({ type: "prev" });
    expect(matchVoiceCommand("passaggio precedente")).toEqual({ type: "prev" });
    expect(matchVoiceCommand("avvia timer")).toEqual({ type: "timer" });
    expect(matchVoiceCommand("parti")).toEqual({ type: "timer" });
  });

  it("returns null for unrecognized speech", () => {
    expect(matchVoiceCommand("che ore sono")).toBeNull();
    expect(matchVoiceCommand("")).toBeNull();
  });

  it("does not false-trigger prev on a negated sentence", () => {
    expect(matchVoiceCommand("non voglio andare indietro")).toBeNull();
  });

  it("recognizes repeat and time-left commands", () => {
    expect(matchVoiceCommand("ripeti il passaggio")).toEqual({ type: "repeat" });
    expect(matchVoiceCommand("quanto manca")).toEqual({ type: "timeLeft" });
  });

  it("recognizes jump-to-step with digits and number words", () => {
    expect(matchVoiceCommand("vai al passaggio 3")).toEqual({ type: "jump", step: 3 });
    expect(matchVoiceCommand("vai al passaggio cinque")).toEqual({ type: "jump", step: 5 });
  });
});

describe("next synonyms", () => {
  it.each(["successivo", "passaggio successivo", "dopo"])("%s → next", (phrase) => {
    expect(matchVoiceCommand(phrase)).toEqual({ type: "next" });
  });
});
