/**
 * Scene version tracking for efficient save deduplication
 * 
 * This mirrors Excalidraw's getSceneVersion() approach:
 * - Sum of all element versions creates a unique scene fingerprint
 * - Only save when version changes (actual changes occurred)
 * - Throttle saves instead of debouncing (periodic saves vs wait-for-idle)
 */

import type { ExcalidrawElement } from "@excalidraw/excalidraw/types";

/**
 * Calculate scene version by summing all element versions
 * This is the same algorithm Excalidraw uses
 */
export function getSceneVersion(elements: readonly ExcalidrawElement[] | undefined): number {
  if (!elements || !Array.isArray(elements)) return 0;
  return elements.reduce((acc, el) => acc + (el?.version || 0), 0);
}

/**
 * Calculate a hash of elements for quick comparison
 * Uses the same djb2 algorithm as Excalidraw's hashElementsVersion
 */
export function hashSceneElements(elements: readonly ExcalidrawElement[]): number {
  let hash = 5381;
  for (const element of elements) {
    hash = (hash << 5) + hash + (element.versionNonce || 0);
  }
  return hash;
}

/**
 * Check if two element arrays represent the same scene
 */
export function isSameScene(
  elementsA: readonly ExcalidrawElement[],
  elementsB: readonly ExcalidrawElement[]
): boolean {
  if (elementsA.length !== elementsB.length) return false;
  return getSceneVersion(elementsA) === getSceneVersion(elementsB);
}

/**
 * Scene version cache to track what's been saved
 */
export class SceneVersionCache {
  private static cache = new Map<string, number>();

  static get(sceneId: string): number | undefined {
    return this.cache.get(sceneId);
  }

  static set(sceneId: string, elements: readonly ExcalidrawElement[] | undefined): void {
    this.cache.set(sceneId, getSceneVersion(elements));
  }

  static isSaved(
    sceneId: string,
    elements: readonly ExcalidrawElement[] | undefined
  ): boolean {
    if (!elements || !Array.isArray(elements)) return true;
    const cachedVersion = this.get(sceneId);
    if (cachedVersion === undefined) return false;
    return cachedVersion === getSceneVersion(elements);
  }

  static clear(sceneId: string): void {
    this.cache.delete(sceneId);
  }

  static clearAll(): void {
    this.cache.clear();
  }
}
