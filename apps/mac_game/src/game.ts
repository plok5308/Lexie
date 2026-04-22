import { scenes, INITIAL_SCENE_ID } from "./scenes";
import type { Scene } from "./scenes";

export class Game {
  private currentId: string = INITIAL_SCENE_ID;

  current(): Scene {
    const scene = scenes[this.currentId];
    if (!scene) {
      throw new Error(`Unknown scene: ${this.currentId}`);
    }
    return scene;
  }

  advance(): Scene {
    const current = this.current();
    if (!current.nextSceneId) {
      return current;
    }
    this.currentId = current.nextSceneId;
    return this.current();
  }

  reset(): Scene {
    this.currentId = INITIAL_SCENE_ID;
    return this.current();
  }

  isTerminal(): boolean {
    return Boolean(this.current().terminal);
  }
}
