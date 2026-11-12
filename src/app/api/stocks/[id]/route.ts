
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stock = await prisma.stock.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            dailyPrices: true,
            transactions: true,
          },
        },
      },
    });

    if (!stock) {
      return Response.json(
        { error: "Stock not found." },
        { status: 404 }
      );
    }

    if (
      stock._count.dailyPrices > 0 ||
      stock._count.transactions > 0
    ) {
      return Response.json(
        {
          error:
            "This stock cannot be deleted because it has recorded prices or transactions.",
        },
        { status: 409 }
      );
    }

    await prisma.stock.delete({
      where: { id },
    });

    return Response.json({
      message: "Stock deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting stock:", error);

    return Response.json(
      { error: "Failed to delete stock." },
      { status: 500 }
    );
  }
}
