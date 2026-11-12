
"use client";

import { useEffect, useState, type FormEvent } from "react";

type Stock = {
  id: string;
  companyName: string;
  symbol: string;
  sector: string;
};

type Transaction = {
  id: string;
  stockId: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: string | number;
  date: string;
  profitLoss: string | number | null;
  stock: Stock;
};

type Holding = {
  stockId: string;
  symbol: string;
  companyName: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
};

export default function TransactionsPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stockId, setStockId] = useState("");
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [stockResponse, transactionResponse] = await Promise.all([
        fetch("/api/stocks"),
        fetch("/api/transactions"),
      ]);

      if (!stockResponse.ok || !transactionResponse.ok) {
        throw new Error("Failed to load application data.");
      }

      const stockData: Stock[] = await stockResponse.json();
      const transactionData: Transaction[] =
        await transactionResponse.json();

      setStocks(stockData);
      setTransactions(transactionData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Calculate current holdings using weighted average cost.
  function calculateHoldings(): Holding[] {
    const sortedTransactions = [...transactions].sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const holdings: Record<string, Holding> = {};

    for (const transaction of sortedTransactions) {
      const id = transaction.stockId;
      const transactionPrice = Number(transaction.price);

      if (!holdings[id]) {
        holdings[id] = {
          stockId: id,
          symbol: transaction.stock.symbol,
          companyName: transaction.stock.companyName,
          quantity: 0,
          averageCost: 0,
          totalCost: 0,
        };
      }

      const holding = holdings[id];

      if (transaction.type === "BUY") {
        holding.totalCost += transaction.quantity * transactionPrice;
        holding.quantity += transaction.quantity;
      } else {
        const averageCost =
          holding.quantity > 0
            ? holding.totalCost / holding.quantity
            : 0;

        holding.quantity -= transaction.quantity;
        holding.totalCost = averageCost * holding.quantity;
      }

      holding.averageCost =
        holding.quantity > 0
          ? holding.totalCost / holding.quantity
          : 0;
    }

    return Object.values(holdings).filter(
      (holding) => holding.quantity > 0
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const transactionQuantity = Number(quantity);
    const transactionPrice = Number(price);

    if (!stockId || !date || !quantity || !price) {
      setError("Please complete all fields.");
      return;
    }

    if (
      !Number.isSafeInteger(transactionQuantity) ||
      transactionQuantity <= 0
    ) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    if (!Number.isFinite(transactionPrice) || transactionPrice <= 0) {
      setError("Price must be greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockId,
          type,
          quantity: transactionQuantity,
          price: transactionPrice,
          date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save transaction.");
      }

      setTransactions((previous) => [data, ...previous]);
      setQuantity("");
      setPrice("");
      setDate("");

      setSuccess(
        type === "BUY"
          ? "Share purchase recorded successfully."
          : `Share sale recorded successfully. Realised ${
              Number(data.profitLoss) >= 0 ? "profit" : "loss"
            }: KES ${Math.abs(Number(data.profitLoss)).toFixed(2)}.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  const holdings = calculateHoldings();

  const totalInvested = holdings.reduce(
    (total, holding) => total + holding.totalCost,
    0
  );

  const realisedProfitLoss = transactions.reduce(
    (total, transaction) =>
      total + Number(transaction.profitLoss ?? 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Stock Transactions</h1>
          <p className="mt-2 text-slate-400">
            Record share purchases and sales and monitor your portfolio.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-700 bg-red-950 p-4 text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-700 bg-green-950 p-4 text-green-300">
            {success}
          </div>
        )}

        {/* Portfolio summary */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Shares Held</p>
            <h2 className="mt-2 text-2xl font-bold">
              {holdings.reduce(
                (total, holding) => total + holding.quantity,
                0
              ).toLocaleString("en-GB")}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Remaining Investment</p>
            <h2 className="mt-2 text-2xl font-bold">
              KES {totalInvested.toLocaleString("en-GB", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Realised Profit / Loss</p>
            <h2
              className={`mt-2 text-2xl font-bold ${
                realisedProfitLoss >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {realisedProfitLoss < 0 ? "-" : ""}
              KES {Math.abs(realisedProfitLoss).toLocaleString("en-GB", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h2>
          </div>
        </section>

        {/* Transaction form */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-6 text-xl font-semibold">
            Record a Transaction
          </h2>

          {stocks.length === 0 && !loading && (
            <p className="mb-4 text-amber-300">
              Please register a stock counter before recording transactions.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Transaction Type
              </label>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as "BUY" | "SELL")
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
              >
                <option value="BUY">Buy Shares</option>
                <option value="SELL">Sell Shares</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Stock Counter
              </label>
              <select
                value={stockId}
                onChange={(event) => setStockId(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                required
              >
                <option value="">Select a stock</option>
                {stocks.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.symbol} - {stock.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="e.g. 40"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Price per Share (KES)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="e.g. 15.00"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || stocks.length === 0}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Transaction"}
            </button>
          </form>
        </section>

        {/* Current holdings */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-xl font-semibold">Current Holdings</h2>

          {holdings.length === 0 ? (
            <p className="text-slate-400">
              You do not currently hold any shares.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="p-3">Counter</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Shares Held</th>
                    <th className="p-3">Average Cost</th>
                    <th className="p-3">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr
                      key={holding.stockId}
                      className="border-b border-slate-800"
                    >
                      <td className="p-3 font-semibold">
                        {holding.symbol}
                      </td>
                      <td className="p-3">{holding.companyName}</td>
                      <td className="p-3">
                        {holding.quantity.toLocaleString("en-GB")}
                      </td>
                      <td className="p-3">
                        KES {holding.averageCost.toFixed(2)}
                      </td>
                      <td className="p-3">
                        KES {holding.totalCost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Transaction history */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Transaction History</h2>
              <p className="mt-1 text-sm text-slate-400">
                {transactions.length} transaction(s) recorded
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <p className="text-slate-400">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-slate-400">
              No transactions have been recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="p-3">Date</th>
                    <th className="p-3">Counter</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Profit / Loss</th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-slate-800"
                    >
                      <td className="p-3">
                        {new Date(transaction.date).toLocaleDateString(
                          "en-GB",
                          { timeZone: "UTC" }
                        )}
                      </td>
                      <td className="p-3 font-semibold">
                        {transaction.stock?.symbol ?? "Unknown"}
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            transaction.type === "BUY"
                              ? "text-blue-400"
                              : "text-amber-400"
                          }
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="p-3">
                        {transaction.quantity.toLocaleString("en-GB")}
                      </td>
                      <td className="p-3">
                        KES {Number(transaction.price).toFixed(2)}
                      </td>
                      <td className="p-3">
                        {transaction.profitLoss === null ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <span
                            className={
                              Number(transaction.profitLoss) >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            KES {Number(transaction.profitLoss).toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
