import { db } from "../lib/db";
import { buildSceneSearchText } from "../lib/scene-search";

const BATCH_SIZE = 500;

const run = async () => {
  let lastId: string | undefined;
  let updated = 0;

  while (true) {
    const scenes = await db.scene.findMany({
      take: BATCH_SIZE,
      ...(lastId ? { skip: 1, cursor: { id: lastId } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        content: true,
        searchText: true,
      },
    });

    if (!scenes.length) {
      break;
    }

    const updates = scenes.flatMap((scene) => {
      const next = buildSceneSearchText({
        title: scene.title,
        content: scene.content,
      });
      if (next === scene.searchText) {
        return [];
      }
      return [
        db.scene.update({
          where: { id: scene.id },
          data: { searchText: next },
        }),
      ];
    });

    if (updates.length) {
      await db.$transaction(updates);
      updated += updates.length;
    }

    lastId = scenes[scenes.length - 1].id;
  }

  console.log(`Backfill complete. Updated ${updated} scenes.`);
};

run()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
