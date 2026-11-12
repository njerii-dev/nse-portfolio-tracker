
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [stocks, prices, transactions] = await Promise.all([
      prisma.stock.findMany({
        orderBy: { symbol: "asc" },
      }),

      prisma.dailyPrice.findMany({
        include: { stock: true },
        orderBy: { date: "asc" },
      }),

      prisma.transaction.findMany({
        include: { stock: true },
        orderBy: [
          { date: "asc" },
          { createdAt: "asc" },
        ],
      }),
    ]);

    return Response.json({
      stocks,
      prices,
      transactions,
    });
  } catch (error) {
    console.error("Error retrieving analytics:", error);

    return Response.json(
      { error: "Failed to retrieve analytics data." },
      { status: 500 }
    );
  }
}
