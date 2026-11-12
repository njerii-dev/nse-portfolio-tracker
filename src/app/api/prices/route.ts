
import { prisma } from "@/lib/prisma";

// GET: Retrieve all recorded daily stock prices
export async function GET() {
  try {
    const prices = await prisma.dailyPrice.findMany({
      include: { stock: true },
      orderBy: { date: "desc" },
    });

    return Response.json(prices);
  } catch (error) {
    console.error("Error retrieving prices:", error);

    return Response.json(
      { error: "Failed to retrieve daily prices." },
      { status: 500 }
    );
  }
}

// POST: Record a new daily stock price
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const stockId = String(body.stockId ?? "").trim();
    const date = String(body.date ?? "").trim();
    const opening = Number(body.opening);
    const highest = Number(body.highest);
    const lowest = Number(body.lowest);
    const closing = Number(body.closing);
    const volume = Number(body.volume);

    if (!stockId || !date) {
      return Response.json(
        { error: "Please select a stock and provide a date." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json(
        { error: "Please provide a valid date." },
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

    const prices = [opening, highest, lowest, closing];

    if (
      prices.some(
        (price) => !Number.isFinite(price) || price <= 0
      )
    ) {
      return Response.json(
        { error: "All stock prices must be greater than zero." },
        { status: 400 }
      );
    }

    if (!Number.isSafeInteger(volume) || volume < 0) {
      return Response.json(
        {
          error:
            "Trading volume must be a whole number greater than or equal to zero.",
        },
        { status: 400 }
      );
    }

    if (
      highest < lowest ||
      highest < opening ||
      highest < closing ||
      lowest > opening ||
      lowest > closing
    ) {
      return Response.json(
        {
          error:
            "Highest price must be greater than or equal to opening and closing prices, and lowest price must be less than or equal to both.",
        },
        { status: 400 }
      );
    }

    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!stock) {
      return Response.json(
        { error: "Selected stock does not exist." },
        { status: 404 }
      );
    }

    const dailyPrice = await prisma.dailyPrice.create({
      data: {
        stockId,
        date: parsedDate,
        opening,
        highest,
        lowest,
        closing,
        volume,
      },
      include: { stock: true },
    });

    return Response.json(dailyPrice, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return Response.json(
        {
          error:
            "A daily price record already exists for this stock and date.",
        },
        { status: 409 }
      );
    }

    console.error("Error recording daily price:", error);

    return Response.json(
      { error: "Failed to record daily price." },
      { status: 500 }
    );
  }
}
