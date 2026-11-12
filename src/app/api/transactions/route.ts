
import { prisma } from "@/lib/prisma";

// GET: Retrieve all purchases and sales
export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { stock: true },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" },
      ],
    });

    return Response.json(transactions);
  } catch (error) {
    console.error("Error retrieving transactions:", error);

    return Response.json(
      { error: "Failed to retrieve transactions." },
      { status: 500 }
    );
  }
}

// POST: Record a purchase or sale
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const stockId = String(body.stockId ?? "").trim();
    const type = String(body.type ?? "").trim().toUpperCase();
    const date = String(body.date ?? "").trim();
    const quantity = Number(body.quantity);
    const price = Number(body.price);

    if (!stockId || !date || !type) {
      return Response.json(
        { error: "Stock, transaction type and date are required." },
        { status: 400 }
      );
    }

    if (type !== "BUY" && type !== "SELL") {
      return Response.json(
        { error: "Transaction type must be BUY or SELL." },
        { status: 400 }
      );
    }

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      return Response.json(
        { error: "Quantity must be a positive whole number." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return Response.json(
        { error: "Share price must be greater than zero." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json(
        { error: "Please provide a valid transaction date." },
        { status: 400 }
      );
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return Response.json(
        { error: "Please provide a valid calendar date." },
        { status: 400 }
      );
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({
        where: { id: stockId },
      });

      if (!stock) {
        throw new Error("STOCK_NOT_FOUND");
      }

      // Retrieve previous transactions in chronological order.
      const previousTransactions = await tx.transaction.findMany({
        where: { stockId },
        orderBy: [
          { date: "asc" },
          { createdAt: "asc" },
        ],
      });

      // Reconstruct the current holdings using weighted average cost.
      let sharesHeld = 0;
      let totalCost = 0;
      let latestDate: Date | null = null;

      for (const previous of previousTransactions) {
        const previousPrice = Number(previous.price);

        if (previous.type === "BUY") {
          sharesHeld += previous.quantity;
          totalCost += previous.quantity * previousPrice;
        } else {
          const averageCost =
            sharesHeld > 0 ? totalCost / sharesHeld : 0;

          sharesHeld -= previous.quantity;
          totalCost = averageCost * sharesHeld;
        }

        latestDate = previous.date;
      }

      // Prevent backdated transactions from changing historical calculations.
      if (latestDate && parsedDate < latestDate) {
        throw new Error("BACKDATED_TRANSACTION");
      }

      let profitLoss: number | null = null;

      if (type === "SELL") {
        if (quantity > sharesHeld) {
          throw new Error(
            `INSUFFICIENT_SHARES:${sharesHeld}`
          );
        }

        const averageCost = totalCost / sharesHeld;

        profitLoss =
          Math.round(
            ((price - averageCost) * quantity + Number.EPSILON) * 100
          ) / 100;
      }

      return await tx.transaction.create({
        data: {
          stockId,
          type,
          quantity,
          price,
          date: parsedDate,
          profitLoss,
        },
        include: { stock: true },
      });
    });

    return Response.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "STOCK_NOT_FOUND") {
        return Response.json(
          { error: "Selected stock does not exist." },
          { status: 404 }
        );
      }

      if (error.message === "BACKDATED_TRANSACTION") {
        return Response.json(
          {
            error:
              "This transaction date is earlier than your latest transaction for this stock. Please use the latest transaction date or a later date.",
          },
          { status: 400 }
        );
      }

      if (error.message.startsWith("INSUFFICIENT_SHARES:")) {
        const available = error.message.split(":")[1];

        return Response.json(
          {
            error: `You cannot sell more shares than you own. Available: ${available}.`,
          },
          { status: 400 }
        );
      }
    }

    console.error("Error recording transaction:", error);

    return Response.json(
      { error: "Failed to record transaction." },
      { status: 500 }
    );
  }
}
