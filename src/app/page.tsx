
"use client";

import { useEffect, useMemo, useState } from "react";

type Stock = {
  id: string;
  companyName: string;
  symbol: string;
  sector: string;
};

type DailyPrice = {
  id: string;
  stockId: string;
  date: string;
  opening: string | number;
  highest: string | number;
  lowest: string | number;
  closing: string | number;
  volume: number;
  stock: Stock;
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
  createdAt?: string;
};

type Holding = {
  stockId: string;
  symbol: string;
  companyName: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
  latestPrice: number | null;
  marketValue: number | null;
  profitLoss: number | null;
};

type AnalyticsData = {
  stocks: Stock[];
  prices: DailyPrice[];
  transactions: Transaction[];
};

function money(value: number) {
  return `KES ${value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function StatCard({
  title,
  value,
  description,
  icon,
  valueClass = "text-slate-900",
}: {
  title: string;
  value: string;
  description: string;
  icon: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <span className="rounded-lg bg-emerald-50 p-2 text-lg">
          {icon}
        </span>
      </div>
      <h2 className={`mt-4 text-2xl font-bold ${valueClass}`}>
        {value}
      </h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<AnalyticsData>({
    stocks: [],
    prices: [],
    transactions: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStock, setSelectedStock] = useState("ALL");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analytics");

      if (!response.ok) {
        throw new Error("Failed to load Dashboard data.");
      }

      const result: AnalyticsData = await response.json();

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the Dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // Calculate holdings using the weighted average cost method.
  const holdings = useMemo(() => {
    const sortedTransactions = [...data.transactions].sort(
      (a, b) => {
        const dateDifference =
          new Date(a.date).getTime() - new Date(b.date).getTime();

        if (dateDifference !== 0) return dateDifference;

        return (
          new Date(a.createdAt ?? a.date).getTime() -
          new Date(b.createdAt ?? b.date).getTime()
        );
      }
    );

    const result: Record<string, Holding> = {};

    for (const transaction of sortedTransactions) {
      const id = transaction.stockId;
      const price = Number(transaction.price);

      if (!result[id]) {
        result[id] = {
          stockId: id,
          symbol: transaction.stock.symbol,
          companyName: transaction.stock.companyName,
          quantity: 0,
          averageCost: 0,
          totalCost: 0,
          latestPrice: null,
          marketValue: null,
          profitLoss: null,
        };
      }

      const holding = result[id];

      if (transaction.type === "BUY") {
        holding.quantity += transaction.quantity;
        holding.totalCost += transaction.quantity * price;
      } else {
        const averageCost =
          holding.quantity > 0
            ? holding.totalCost / holding.quantity
            : 0;

        holding.quantity -= transaction.quantity;
        holding.totalCost =
          averageCost * holding.quantity;
      }

      holding.averageCost =
        holding.quantity > 0
          ? holding.totalCost / holding.quantity
          : 0;
    }

    // Find the most recently recorded closing price for each stock.
    for (const holding of Object.values(result)) {
      const stockPrices = data.prices
        .filter((price) => price.stockId === holding.stockId)
        .sort(
          (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
        );

      if (stockPrices.length > 0) {
        holding.latestPrice = Number(stockPrices[0].closing);
        holding.marketValue =
          holding.quantity * holding.latestPrice;

        holding.profitLoss =
          holding.marketValue - holding.totalCost;
      }
    }

    return Object.values(result).filter(
      (holding) => holding.quantity > 0
    );
  }, [data.transactions, data.prices]);

  const totalShares = holdings.reduce(
    (total, holding) => total + holding.quantity,
    0
  );

  const totalInvested = holdings.reduce(
    (total, holding) => total + holding.totalCost,
    0
  );

  const portfolioValue = holdings.reduce(
    (total, holding) => total + (holding.marketValue ?? 0),
    0
  );

  const unrealisedProfitLoss = holdings.reduce(
    (total, holding) => total + (holding.profitLoss ?? 0),
    0
  );

  const realisedProfitLoss = data.transactions.reduce(
    (total, transaction) =>
      total + Number(transaction.profitLoss ?? 0),
    0
  );

  const totalProfitLoss =
    realisedProfitLoss + unrealisedProfitLoss;

  const returnPercentage =
    totalInvested > 0
      ? (totalProfitLoss / totalInvested) * 100
      : 0;

  const latestPrices = useMemo(() => {
    const result: Record<string, DailyPrice> = {};

    for (const price of data.prices) {
      const existing = result[price.stockId];

      if (
        !existing ||
        new Date(price.date).getTime() >
          new Date(existing.date).getTime()
      ) {
        result[price.stockId] = price;
      }
    }

    return result;
  }, [data.prices]);

  const recentTransactions = [...data.transactions]
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    )
    .slice(0, 5);

  const selectedPrices = useMemo(() => {
    return data.prices
      .filter(
        (price) =>
          selectedStock === "ALL" ||
          price.stockId === selectedStock
      )
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      );
  }, [data.prices, selectedStock]);

  const chartValues = selectedPrices.map((price) =>
    Number(price.closing)
  );

  const chartMinimum =
    chartValues.length > 0
      ? Math.min(...chartValues)
      : 0;

  const chartMaximum =
    chartValues.length > 0
      ? Math.max(...chartValues)
      : 0;

  const chartRange =
    chartMaximum - chartMinimum || 1;

  const chartPoints = chartValues
    .map((value, index) => {
      const x =
        chartValues.length > 1
          ? (index / (chartValues.length - 1)) * 700
          : 350;

      const y =
        190 - ((value - chartMinimum) / chartRange) * 150;

      return { x, y, value };
    });

  const linePoints = chartPoints
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const areaPath =
    chartPoints.length > 0
      ? `M${chartPoints[0].x} ${chartPoints[0].y} ${chartPoints
          .slice(1)
          .map((point) => `L${point.x} ${point.y}`)
          .join(" ")} L700 210 L0 210 Z`
      : "";

  const allocationTotal = holdings.reduce(
    (total, holding) => total + holding.totalCost,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      {/* Sidebar */}
      <aside className="w-full border-b border-slate-200 bg-slate-950 p-6 text-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="mb-10">
         <h1 className="text-xl font-bold tracking-wide">
  Soko<span className="text-emerald-400">Track</span>
</h1>
<p className="mt-1 text-xs text-slate-400">
  Kenya Stock Portfolio Management
</p>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Main menu
        </p>

        <nav className="space-y-2">
          <a
            href="/"
            className="block rounded-lg bg-emerald-500 px-4 py-3 text-sm font-medium text-white"
          >
            ▦ &nbsp; Dashboard
          </a>
          <a
            href="/stocks"
            className="block rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
          >
            ◫ &nbsp; Stock Counters
          </a>
          <a
            href="/prices"
            className="block rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
          >
            ◷ &nbsp; Daily Prices
          </a>
          <a
            href="/transactions"
            className="block rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
          >
            ↗ &nbsp; Transactions
          </a>
          <a
            href="/analytics"
            className="block rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
          >
            ▥ &nbsp; Analytics
          </a>
        </nav>

        <div className="mt-12 rounded-xl border border-slate-700 p-4">
          <p className="text-sm font-semibold">
            SokoTrack
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Monitor stock prices, investments and portfolio performance.
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Capital Markets / Overview
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Dashboard
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your Nairobi Securities Exchange portfolio at a glance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Manually recorded prices · Not live NSE data
            </span>

            <button
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Loading your portfolio...
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Portfolio Value"
                value={money(portfolioValue)}
                description="Based on latest recorded closing prices"
                icon="💰"
              />

              <StatCard
                title="Remaining Investment"
                value={money(totalInvested)}
                description="Cost of shares currently held"
                icon="📊"
              />

              <StatCard
                title="Total Profit / Loss"
                value={`${totalProfitLoss < 0 ? "-" : ""}${money(
                  Math.abs(totalProfitLoss)
                )}`}
                description={`${returnPercentage.toFixed(2)}% overall return`}
                icon="📈"
                valueClass={
                  totalProfitLoss >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }
              />

              <StatCard
                title="Stock Counters"
                value={String(data.stocks.length)}
                description={`${totalShares.toLocaleString("en-GB")} shares currently held`}
                icon="🏢"
              />
            </section>

            {/* Additional P/L breakdown */}
            <section className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">
                  Realised Profit / Loss
                </p>
                <p
                  className={`mt-2 text-xl font-bold ${
                    realisedProfitLoss >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {money(realisedProfitLoss)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  From completed share sales
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">
                  Unrealised Profit / Loss
                </p>
                <p
                  className={`mt-2 text-xl font-bold ${
                    unrealisedProfitLoss >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {money(unrealisedProfitLoss)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Based on latest recorded prices for held shares
                </p>
              </div>
            </section>

            {/* Chart and portfolio information */}
            <section className="mt-6 grid gap-6 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      Recorded Closing Prices
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Historical prices entered into the application
                    </p>
                  </div>

                  <select
                    value={selectedStock}
                    onChange={(event) =>
                      setSelectedStock(event.target.value)
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <option value="ALL">All counters</option>
                    {data.stocks.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPrices.length === 0 ? (
                  <div className="mt-8 rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">
                    No daily prices have been recorded for this selection yet.
                  </div>
                ) : (
                  <>
                    <div className="mt-6">
                      <svg
                        viewBox="0 0 700 230"
                        className="h-64 w-full"
                        preserveAspectRatio="none"
                        role="img"
                        aria-label="Recorded closing price chart"
                      >
                        {[40, 90, 140, 190].map((y) => (
                          <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="700"
                            y2={y}
                            stroke="#e2e8f0"
                            strokeDasharray="5 5"
                          />
                        ))}

                        {chartPoints.length > 1 && (
                          <>
                            <path
                              d={areaPath}
                              fill="#10b981"
                              fillOpacity="0.10"
                            />
                            <polyline
                              points={linePoints}
                              fill="none"
                              stroke="#059669"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </>
                        )}

                        {chartPoints.map((point, index) => (
                          <circle
                            key={selectedPrices[index].id}
                            cx={point.x}
                            cy={point.y}
                            r="5"
                            fill="#059669"
                          />
                        ))}
                      </svg>

                      <div className="flex justify-between gap-2 text-xs text-slate-400">
                        <span>
                          {formatDate(selectedPrices[0].date)}
                        </span>
                        <span>
                          {formatDate(
                            selectedPrices[selectedPrices.length - 1].date
                          )}
                        </span>
                      </div>
                    </div>

                    <p className="mt-4 text-sm font-medium text-slate-700">
                      {selectedPrices.length} recorded price entries
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold">
                  Portfolio Summary
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Distribution by remaining investment cost
                </p>

                <div className="mt-6 space-y-5">
                  {holdings.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No current holdings to display.
                    </p>
                  ) : (
                    holdings.map((holding) => {
                      const percentage =
                        allocationTotal > 0
                          ? (holding.totalCost / allocationTotal) * 100
                          : 0;

                      return (
                        <div key={holding.stockId}>
                          <div className="mb-2 flex justify-between gap-2 text-sm">
                            <span className="font-medium">
                              {holding.symbol}
                            </span>
                            <span>
                              {percentage.toFixed(1)}%
                            </span>
                          </div>

                          <div className="h-2 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-emerald-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* Stock watchlist */}
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h3 className="font-semibold">
                  Registered Stock Counters
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Latest available manually recorded prices
                </p>
              </div>

              {data.stocks.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No stock counters have been registered yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[550px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs text-slate-500">
                      <tr>
                        <th className="pb-3 font-medium">Symbol</th>
                        <th className="pb-3 font-medium">Company</th>
                        <th className="pb-3 font-medium">Latest Closing Price</th>
                        <th className="pb-3 font-medium">Price Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.stocks.map((stock) => {
                        const latest = latestPrices[stock.id];

                        return (
                          <tr
                            key={stock.id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="py-4 font-semibold">
                              {stock.symbol}
                            </td>
                            <td className="py-4 text-slate-600">
                              {stock.companyName}
                            </td>
                            <td className="py-4 font-medium">
                              {latest
                                ? money(Number(latest.closing))
                                : "Not recorded"}
                            </td>
                            <td className="py-4 text-slate-500">
                              {latest
                                ? formatDate(latest.date)
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Current holdings */}
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold">Current Holdings</h3>
              <p className="mt-1 text-xs text-slate-500">
                Your remaining shares and their estimated market values
              </p>

              {holdings.length === 0 ? (
                <p className="mt-5 text-sm text-slate-500">
                  You do not currently hold any shares.
                </p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs text-slate-500">
                      <tr>
                        <th className="pb-3 font-medium">Counter</th>
                        <th className="pb-3 font-medium">Shares</th>
                        <th className="pb-3 font-medium">Average Cost</th>
                        <th className="pb-3 font-medium">Latest Price</th>
                        <th className="pb-3 font-medium">Market Value</th>
                        <th className="pb-3 font-medium">Unrealised P/L</th>
                      </tr>
                    </thead>

                    <tbody>
                      {holdings.map((holding) => (
                        <tr
                          key={holding.stockId}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="py-4 font-semibold">
                            {holding.symbol}
                          </td>
                          <td className="py-4">
                            {holding.quantity.toLocaleString("en-GB")}
                          </td>
                          <td className="py-4">
                            {money(holding.averageCost)}
                          </td>
                          <td className="py-4">
                            {holding.latestPrice !== null
                              ? money(holding.latestPrice)
                              : "Unavailable"}
                          </td>
                          <td className="py-4">
                            {holding.marketValue !== null
                              ? money(holding.marketValue)
                              : "Unavailable"}
                          </td>
                          <td
                            className={`py-4 font-medium ${
                              (holding.profitLoss ?? 0) >= 0
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {holding.profitLoss !== null
                              ? money(holding.profitLoss)
                              : "Unavailable"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Recent transactions */}
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold">
                Recent Transactions
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Your five most recent purchases and sales
              </p>

              <div className="mt-5 space-y-4">
                {recentTransactions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No transactions have been recorded yet.
                  </p>
                ) : (
                  recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-lg px-3 py-2 text-xs font-bold ${
                            transaction.type === "BUY"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {transaction.type}
                        </span>

                        <div>
                          <p className="text-sm font-medium">
                            {transaction.stock.companyName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {transaction.stock.symbol} ·{" "}
                            {transaction.quantity} shares ·{" "}
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm font-semibold">
                        {money(
                          Number(transaction.price) *
                            transaction.quantity
                        )}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        <footer className="mt-8 text-center text-xs text-slate-400">
         SokoTrack · Kenya Stock Portfolio Management System
        </footer>
      </main>
    </div>
  );
}
