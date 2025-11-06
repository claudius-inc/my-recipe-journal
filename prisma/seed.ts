import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createDemoUser() {
  const user = await prisma.user.create({
    data: {
      email: "demo@example.com",
      name: "Demo User",
      emailVerified: true,
    },
  });

  console.log(`Created demo user: ${user.email} (${user.id})`);
  return user.id;
}

async function createBreadRecipe(userId: string) {
  const recipe = await prisma.recipe.create({
    data: {
      userId,
      name: "Country Sourdough",
      category: "bread",
      description: "Open-crumb sourdough with mild tang and caramelized crust.",
      tags: ["sourdough", "wild-yeast"],
      versions: {
        create: [
          {
            title: "Baseline loaf",
            notes: "Bulk fermented for 4.5h @ 24°C with three coil folds.",
            tastingNotes: "Balanced acidity, caramel crust, medium-open crumb.",
            nextSteps:
              "Test longer autolyse and retarded proof for schedule flexibility.",
            metadata: {
              bulkFermentation: "4.5h until 50% rise",
              proofing: "Cold proof 12h, bench rest 45m",
            },
            ingredients: {
              create: [
                {
                  name: "Bread flour",
                  quantity: 800,
                  unit: "g",
                  role: "flour",
                  sortOrder: 1,
                },
                {
                  name: "Whole wheat flour",
                  quantity: 200,
                  unit: "g",
                  role: "flour",
                  sortOrder: 2,
                },
                {
                  name: "Water",
                  quantity: 750,
                  unit: "g",
                  role: "liquid",
                  sortOrder: 3,
                },
                {
                  name: "Levain",
                  quantity: 200,
                  unit: "g",
                  role: "preferment",
                  sortOrder: 4,
                },
                {
                  name: "Sea salt",
                  quantity: 20,
                  unit: "g",
                  role: "salt",
                  sortOrder: 5,
                },
              ],
            },
          },
          {
            title: "High hydration + seeds",
            notes: "Added lamination with toasted seeds, longer cold proof.",
            tastingNotes: "Loftier crumb, nutty aroma, slightly thinner crust day two.",
            nextSteps: "Dial back levain to 18% and extend cold proof to 18h.",
            metadata: {
              bulkFermentation: "4h with bassinage",
              proofing: "Cold 16h, room rest 60m",
            },
            ingredients: {
              create: [
                {
                  name: "Bread flour",
                  quantity: 780,
                  unit: "g",
                  role: "flour",
                  sortOrder: 1,
                },
                {
                  name: "Whole wheat flour",
                  quantity: 220,
                  unit: "g",
                  role: "flour",
                  sortOrder: 2,
                },
                {
                  name: "Water",
                  quantity: 780,
                  unit: "g",
                  role: "liquid",
                  sortOrder: 3,
                },
                {
                  name: "Levain",
                  quantity: 200,
                  unit: "g",
                  role: "preferment",
                  sortOrder: 4,
                },
                {
                  name: "Sea salt",
                  quantity: 20,
                  unit: "g",
                  role: "salt",
                  sortOrder: 5,
                },
                {
                  name: "Toasted sesame seeds",
                  quantity: 60,
                  unit: "g",
                  role: "add_in",
                  sortOrder: 6,
                },
              ],
            },
          },
        ],
      },
    },
    include: { versions: true },
  });

  const latestVersion = recipe.versions[recipe.versions.length - 1];

  await prisma.recipe.update({
    where: { id: recipe.id },
    data: { activeVersionId: latestVersion.id },
  });
}

async function createDrinkRecipe(userId: string) {
  const recipe = await prisma.recipe.create({
    data: {
      userId,
      name: "Citrus Tonic",
      category: "drink",
      description: "Zero-proof tonic with layered citrus bitters and ginger heat.",
      tags: ["zero-proof", "citrus"],
      versions: {
        create: [
          {
            title: "Shaken build",
            notes: "Shake juices and syrup, strain over ice, top with tonic.",
            tastingNotes: "Bright acidity up front, ginger glow, lingering bitters.",
            nextSteps: "Test clarified juice batch for shelf life.",
            metadata: {
              brewTime: 12,
              servingTemp: "Over ice",
            },
            ingredients: {
              create: [
                {
                  name: "Grapefruit juice",
                  quantity: 90,
                  unit: "ml",
                  role: "liquid",
                  sortOrder: 1,
                },
                {
                  name: "Lime juice",
                  quantity: 20,
                  unit: "ml",
                  role: "liquid",
                  sortOrder: 2,
                },
                {
                  name: "Dry tonic water",
                  quantity: 120,
                  unit: "ml",
                  role: "liquid",
                  sortOrder: 3,
                },
                {
                  name: "Ginger syrup",
                  quantity: 15,
                  unit: "ml",
                  role: "sweetener",
                  sortOrder: 4,
                },
                {
                  name: "Citrus bitters",
                  quantity: 4,
                  unit: "dashes",
                  role: "spice",
                  sortOrder: 5,
                },
              ],
            },
          },
        ],
      },
    },
    include: { versions: true },
  });

  await prisma.recipe.update({
    where: { id: recipe.id },
    data: { activeVersionId: recipe.versions[0].id },
  });
}

async function createWeeknightRecipe(userId: string) {
  const recipe = await prisma.recipe.create({
    data: {
      userId,
      name: "Crispy Gochujang Tofu",
      category: "main",
      description: "Sheet-pan tofu with sweet heat glaze and blistered vegetables.",
      tags: ["weeknight", "vegetarian"],
      versions: {
        create: [
          {
            title: "Five spice baseline",
            notes: "Roast tofu on wire rack, toss with glaze, broil to finish.",
            tastingNotes: "Crunchy edges, sticky glaze, needs more acidity.",
            nextSteps: "Add pickled veg topper and test convection setting.",
            metadata: {
              cookTime: "30 min total",
              servings: 3,
            },
            ingredients: {
              create: [
                {
                  name: "Extra firm tofu",
                  quantity: 400,
                  unit: "g",
                  role: "other",
                  sortOrder: 1,
                },
                {
                  name: "Gochujang",
                  quantity: 45,
                  unit: "g",
                  role: "spice",
                  sortOrder: 2,
                },
                {
                  name: "Maple syrup",
                  quantity: 30,
                  unit: "g",
                  role: "sweetener",
                  sortOrder: 3,
                },
                {
                  name: "Rice vinegar",
                  quantity: 15,
                  unit: "g",
                  role: "liquid",
                  sortOrder: 4,
                },
                {
                  name: "Sesame oil",
                  quantity: 10,
                  unit: "g",
                  role: "fat",
                  sortOrder: 5,
                },
                {
                  name: "Broccoli florets",
                  quantity: 250,
                  unit: "g",
                  role: "add_in",
                  sortOrder: 6,
                },
              ],
            },
          },
        ],
      },
    },
    include: { versions: true },
  });

  await prisma.recipe.update({
    where: { id: recipe.id },
    data: { activeVersionId: recipe.versions[0].id },
  });
}

async function main() {
  // Clean up existing data
  await prisma.ingredient.deleteMany();
  await prisma.recipeVersion.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const userId = await createDemoUser();

  // Create seed recipes for the demo user
  await createBreadRecipe(userId);
  await createDrinkRecipe(userId);
  await createWeeknightRecipe(userId);

  console.log("\n✔ Seed data applied successfully!");
  console.log(`Demo user credentials: demo@example.com`);
  console.log(`You can sign in with a magic link sent to this email.\n`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
