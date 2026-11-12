
import { prisma } from "@/lib/prisma";
// GET: Retrieve all registered stocks
export async function GET() {
  try {
    const stocks = await prisma.stock.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json(stocks);
  } catch (error) {
    console.error("Error retrieving stocks:", error);

    return Response.json(
      { error: "Failed to retrieve stocks." },
      { status: 500 }
    );
  }
}

// POST: Register a new stock
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const companyName = String(body.companyName ?? "").trim();
    const symbol = String(body.symbol ?? "").trim().toUpperCase();
    const sector = String(body.sector ?? "").trim();

    if (!companyName || !symbol || !sector) {
      return Response.json(
        { error: "Company name, symbol and sector are required." },
        { status: 400 }
      );
    }

    const stock = await prisma.stock.create({
      data: {
        companyName,
        symbol,
        sector,
      },
    });

    return Response.json(stock, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return Response.json(
        { error: "A stock with this symbol already exists." },
        { status: 409 }
      );
    }

    console.error("Error registering stock:", error);

    return Response.json(
      { error: "Failed to register stock." },
      { status: 500 }
    );
  }
}
