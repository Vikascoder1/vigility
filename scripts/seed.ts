/* eslint-disable no-console */
import { prisma } from "../lib/prisma";
const FEATURES = ["date_picker", "filter_age", "chart_bar", "filter_gender"];

async function main() {
  console.log("Seeding database...");

  const users = await Promise.all(
    Array.from({ length: 6 }).map((_, i) =>
      prisma.user.upsert({
        where: { username: `user${i + 1}` },
        update: {},
        create: {
          username: `user${i + 1}`,
          passwordHash:
            "$2a$10$oGZlviJkKenA1WHS7P5wdOaZvqmDoJJvA9ZQQVzgXA9pCiEg9yhCe", // "password123"
          age: 16 + i * 8,
          gender: i % 3 === 0 ? "Male" : i % 3 === 1 ? "Female" : "Other",
        },
      }),
    ),
  );

  const now = new Date();
  const daysBack = 120;
  const clicksToCreate: { userId: number; featureName: string; timestamp: Date }[] = [];

  // Generate a denser, more realistic time series so the line chart looks rich
  for (let dayOffset = 0; dayOffset < daysBack; dayOffset += 1) {
    const baseDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    for (const feature of FEATURES) {
      const clicksToday = 10 + Math.floor(Math.random() * 16); // 10–25 clicks per feature per day
      for (let i = 0; i < clicksToday; i += 1) {
        const user = users[Math.floor(Math.random() * users.length)];
        const timestamp = new Date(baseDate.getTime() + Math.floor(Math.random() * 24) * 60 * 60 * 1000);
        clicksToCreate.push({ userId: user.id, featureName: feature, timestamp });
      }
    }
  }

  await prisma.featureClick.createMany({
    data: clicksToCreate,
  });

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


