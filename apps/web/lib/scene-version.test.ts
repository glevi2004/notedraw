import { describe, it, expect, beforeEach } from "vitest";
import {
  getSceneVersion,
  hashSceneElements,
  isSameScene,
  SceneVersionCache,
} from "./scene-version";

// Minimal stub satisfying the parts of ExcalidrawElement used by these utils
const el = (id: string, version: number, versionNonce?: number) =>
  ({ id, version, versionNonce: versionNonce ?? version }) as any;

describe("getSceneVersion", () => {
  it("returns 0 for an empty array", () => {
    expect(getSceneVersion([])).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(getSceneVersion(undefined)).toBe(0);
  });

  it("sums all element versions", () => {
    expect(getSceneVersion([el("a", 1), el("b", 2), el("c", 3)])).toBe(6);
  });

  it("treats elements with missing version as 0", () => {
    expect(getSceneVersion([{ id: "a" } as any])).toBe(0);
  });
});

describe("hashSceneElements", () => {
  it("returns the same hash for the same elements", () => {
    const elements = [el("a", 1, 100), el("b", 2, 200)];
    expect(hashSceneElements(elements)).toBe(hashSceneElements(elements));
  });

  it("returns a different hash when versionNonce changes", () => {
    const a = hashSceneElements([el("a", 1, 100)]);
    const b = hashSceneElements([el("a", 1, 999)]);
    expect(a).not.toBe(b);
  });

  it("returns 5381 (initial seed) for an empty array", () => {
    // djb2 seed is 5381; no iterations means hash stays 5381
    expect(hashSceneElements([])).toBe(5381);
  });
});

describe("isSameScene", () => {
  it("returns true for two identical element arrays", () => {
    const elements = [el("a", 1), el("b", 2)];
    expect(isSameScene(elements, elements)).toBe(true);
  });

  it("returns false when arrays have different lengths", () => {
    expect(isSameScene([el("a", 1)], [el("a", 1), el("b", 2)])).toBe(false);
  });

  it("returns false when element versions differ", () => {
    expect(isSameScene([el("a", 1)], [el("a", 2)])).toBe(false);
  });

  it("returns true when version sums match even with different distribution", () => {
    // Both sum to 3 — isSameScene only compares version sums
    expect(isSameScene([el("a", 1), el("b", 2)], [el("a", 2), el("b", 1)])).toBe(true);
  });
});

describe("SceneVersionCache", () => {
  beforeEach(() => {
    SceneVersionCache.clearAll();
  });

  it("returns undefined for an unknown scene", () => {
    expect(SceneVersionCache.get("scene-1")).toBeUndefined();
  });

  it("stores the version sum of the given elements", () => {
    SceneVersionCache.set("scene-1", [el("a", 3), el("b", 2)]);
    expect(SceneVersionCache.get("scene-1")).toBe(5);
  });

  it("isSaved returns false when scene has never been cached", () => {
    expect(SceneVersionCache.isSaved("scene-1", [el("a", 1)])).toBe(false);
  });

  it("isSaved returns true when cached version matches current elements", () => {
    const elements = [el("a", 4)];
    SceneVersionCache.set("scene-1", elements);
    expect(SceneVersionCache.isSaved("scene-1", elements)).toBe(true);
  });

  it("isSaved returns false when elements have been modified since last save", () => {
    SceneVersionCache.set("scene-1", [el("a", 3)]);
    expect(SceneVersionCache.isSaved("scene-1", [el("a", 4)])).toBe(false);
  });

  it("isSaved returns true for undefined elements (treated as no unsaved changes)", () => {
    expect(SceneVersionCache.isSaved("scene-1", undefined)).toBe(true);
  });

  it("clear removes a specific scene from the cache", () => {
    SceneVersionCache.set("scene-1", [el("a", 1)]);
    SceneVersionCache.clear("scene-1");
    expect(SceneVersionCache.get("scene-1")).toBeUndefined();
  });

  it("clearAll removes all cached scenes", () => {
    SceneVersionCache.set("scene-1", [el("a", 1)]);
    SceneVersionCache.set("scene-2", [el("b", 2)]);
    SceneVersionCache.clearAll();
    expect(SceneVersionCache.get("scene-1")).toBeUndefined();
    expect(SceneVersionCache.get("scene-2")).toBeUndefined();
  });
});
