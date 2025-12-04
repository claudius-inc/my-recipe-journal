const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.recipe.count();
    console.log(`Recipe count: ${count}`);
  } catch (e) {
    console.error("Error counting recipes:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
