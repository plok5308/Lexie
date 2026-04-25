import { Compiler, Story } from "inkjs/full";

export interface SceneFrame {
  id: string;
  imagePath: string;
  openingLine: string;
  sceneContext: string;
  terminal: boolean;
}

export interface GameRef {
  id: string;
  title: string;
}

const ADVANCE_CHOICE = "advance";

const inkSources = import.meta.glob("./games/*/story.ink", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const ctxModules = import.meta.glob("./games/*/sceneContexts.ts", {
  eager: true,
}) as Record<string, { sceneContexts: Record<string, string> }>;

const dataModules = import.meta.glob("./games/*/game-data.json", {
  eager: true,
}) as Record<string, { default: { title?: string } }>;

export function listGames(): GameRef[] {
  return Object.entries(dataModules)
    .map(([path, mod]) => {
      const id = extractGameId(path);
      return { id, title: mod.default.title || id };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getDefaultGameId(): string | null {
  return listGames()[0]?.id ?? null;
}

/**
 * Ink-backed game engine for a single game. The .ink file owns scene flow
 * (knots + advance choices); this class projects the current knot into a
 * `SceneFrame` the rest of the app can render and judge against.
 */
export class GameEngine {
  private story: Story;
  private contexts: Record<string, string>;
  private inkSource: string;

  constructor(public readonly gameId: string) {
    const inkKey = `./games/${gameId}/story.ink`;
    const ctxKey = `./games/${gameId}/sceneContexts.ts`;
    if (!(inkKey in inkSources)) {
      throw new Error(`Game not found: ${gameId}`);
    }
    if (!(ctxKey in ctxModules)) {
      throw new Error(`Game contexts missing: ${gameId}`);
    }
    this.inkSource = inkSources[inkKey];
    this.contexts = ctxModules[ctxKey].sceneContexts;
    this.story = new Compiler(this.inkSource).Compile();
  }

  start(): SceneFrame {
    return this.readFrame();
  }

  reset(): SceneFrame {
    this.story = new Compiler(this.inkSource).Compile();
    return this.readFrame();
  }

  advance(): SceneFrame | null {
    const index = this.story.currentChoices.findIndex(
      (c) => c.text.trim() === ADVANCE_CHOICE,
    );
    if (index === -1) return null;
    this.story.ChooseChoiceIndex(index);
    return this.readFrame();
  }

  isTerminal(): boolean {
    return !this.story.canContinue && this.story.currentChoices.length === 0;
  }

  private readFrame(): SceneFrame {
    this.story.ContinueMaximally();

    const tags = parseTags(this.story.currentTags ?? []);
    const id = tags.get("id");
    if (!id) throw new Error("Scene missing required `# id:` tag");
    const imagePath = tags.get("image");
    if (!imagePath) throw new Error(`Scene "${id}" missing required \`# image:\` tag`);
    const contextId = tags.get("context") ?? id;
    const sceneContext = this.contexts[contextId];
    if (!sceneContext) {
      throw new Error(`No sceneContext registered for "${contextId}" in game ${this.gameId}`);
    }

    return {
      id,
      imagePath,
      openingLine: (this.story.currentText ?? "").trim(),
      sceneContext,
      terminal: tags.has("terminal"),
    };
  }
}

function extractGameId(path: string): string {
  const m = path.match(/games\/([^/]+)\//);
  if (!m) throw new Error(`Cannot extract gameId from path: ${path}`);
  return m[1];
}

function parseTags(rawTags: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const raw of rawTags) {
    const colon = raw.indexOf(":");
    if (colon === -1) {
      map.set(raw.trim(), "");
    } else {
      map.set(raw.slice(0, colon).trim(), raw.slice(colon + 1).trim());
    }
  }
  return map;
}
