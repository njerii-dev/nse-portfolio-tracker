
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Stock = {
  id: string;
  companyName: string;
  symbol: string;
  sector: string;
};

type DailyPrice = {
  id: string;
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
  createdAt: string;
  profitLoss: string | number | null;
  stock: Stock;
};

type AnalyticsData = {
  stocks: Stock[];
  prices: DailyPrice[];
  transactions: Transaction[];
};

type Holding = {
  stockId: string;
  symbol: string;
  companyName: string;
  quantity: number;
  totalCost: number;
  averageCost: number;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    stocks: [],
    prices: [],
    transactions: [],
  });

  const [selectedSymbol, setSelectedSymbol] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analytics");

      if (!response.ok) {
        throw new Error("Unable to retrieve analytics data.");
      }

      const result: AnalyticsData = await response.json();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  // Calculate current holdings using weighted average cost.
  const holdings = useMemo(() => {
    const sortedTransactions = [...data.transactions].sort((a, b) => {
      const dateDifference =
        new Date(a.date).getTime() - new Date(b.date).getTime();

      if (dateDifference !== 0) return dateDifference;

      return (
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
      );
    });

    const result: Record<string, Holding> = {};

    for (const transaction of sortedTransactions) {
      const id = transaction.stockId;
      const transactionPrice = Number(transaction.price);

      if (!result[id]) {
        result[id] = {
          stockId: id,
          symbol: transaction.stock.symbol,
          companyName: transaction.stock.companyName,
          quantity: 0,
          totalCost: 0,
          averageCost: 0,
        };
      }

      const holding = result[id];

      if (transaction.type === "BUY") {
        holding.quantity += transaction.quantity;
        holding.totalCost +=
          transaction.quantity * transactionPrice;
      } else if (holding.quantity > 0) {
        const averageCost =
          holding.totalCost / holding.quantity;

        holding.quantity -= transaction.quantity;
        holding.totalCost =
          averageCost * holding.quantity;
      }

      holding.averageCost =
        holding.quantity > 0
          ? holding.totalCost / holding.quantity
          : 0;
    }

    return Object.values(result).filter(
      (holding) => holding.quantity > 0
    );
  }, [data.transactions]);

  const filteredPrices = useMemo(() => {
    return data.prices.filter(
      (price) =>
        selectedSymbol === "ALL" ||
        price.stock.symbol === selectedSymbol
    );
  }, [data.prices, selectedSymbol]);

  const priceChartData = filteredPrices.map((price) => ({
    date: new Date(price.date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }),
    closing: Number(price.closing),
    symbol: price.stock.symbol,
  }));

  const volumeChartData = filteredPrices.map((price) => ({
    date: new Date(price.date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }),
    volume: Number(price.volume),
    symbol: price.stock.symbol,
  }));

  const pieData = holdings.map((holding) => ({
    name: holding.symbol,
    value: Number(holding.totalCost.toFixed(2)),
  }));

  const totalInvested = holdings.reduce(
    (total, holding) => total + holding.totalCost,
    0
  );

  const totalShares = holdings.reduce(
    (total, holding) => total + holding.quantity,
    0
  );

  const realisedProfitLoss = data.transactions.reduce(
    (total, transaction) =>
      total + Number(transaction.profitLoss ?? 0),
    0
  );

  const buyCount = data.transactions.filter(
    (transaction) => transaction.type === "BUY"
  ).length;

  const sellCount = data.transactions.filter(
    (transaction) => transaction.type === "SELL"
  ).length;

  const chartColours = [
    "#3B82F6",
    "#22C55E",
    "#F59E0B",
    "#A855F7",
    "#EC4899",
    "#06B6D4",
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <p className="text-slate-400">Loading analytics...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Page heading */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Portfolio Analytics
            </h1>
            <p className="mt-2 text-slate-400">
              Monitor stock performance, trading activity and portfolio distribution.
            </p>
          </div>

          <button
            onClick={loadAnalytics}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-700 bg-red-950 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Registered Counters
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              {data.stocks.length}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Shares Held
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              {totalShares.toLocaleString("en-GB")}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Remaining Investment
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              KES {totalInvested.toLocaleString("en-GB", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Realised Profit / Loss
            </p>
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

        {/* Stock selector */}
        <section className="flex flex-wrap items-center gap-4">
          <label
            htmlFor="stock-filter"
            className="text-sm text-slate-300"
          >
            Filter charts by stock:
          </label>

          <select
            id="stock-filter"
            value={selectedSymbol}
            onChange={(event) => setSelectedSymbol(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white"
          >
            <option value="ALL">All counters</option>
            {data.stocks.map((stock) => (
              <option key={stock.id} value={stock.symbol}>
                {stock.symbol}
              </option>
            ))}
          </select>
        </section>

        {/* Stock price chart */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-xl font-semibold">
            Stock Price Movement
          </h2>
          <p className="mb-6 text-sm text-slate-400">
            Daily closing prices in Kenyan shillings.
          </p>

          {priceChartData.length === 0 ? (
            <p className="py-16 text-center text-slate-400">
              No price records available for this selection.
            </p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94A3B8" />
                  <YAxis
                    stroke="#94A3B8"
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [
                      `KES ${Number(value).toFixed(2)}`,
                      "Closing price",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="closing"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Volume chart */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-xl font-semibold">
            Daily Trading Volume
          </h2>
          <p className="mb-6 text-sm text-slate-400">
            Number of shares traded on each recorded date.
          </p>

          {volumeChartData.length === 0 ? (
            <p className="py-16 text-center text-slate-400">
              No trading volume records available.
            </p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="volume"
                    fill="#22C55E"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Portfolio distribution */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-2 text-xl font-semibold">
            Portfolio Distribution
          </h2>
          <p className="mb-6 text-sm text-slate-400">
            Distribution of remaining investment by stock counter.
          </p>

          {pieData.length === 0 ? (
            <p className="py-16 text-center text-slate-400">
              No current holdings available.
            </p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={chartColours[index % chartColours.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `KES ${Number(value).toFixed(2)}`,
                      "Investment",
                    ]}
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Transaction summary */}
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-xl font-semibold">
            Trading Activity Summary
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Total Transactions
              </p>
              <p className="mt-2 text-2xl font-bold">
                {data.transactions.length}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Purchase Transactions
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-400">
                {buyCount}
              </p>
            </div>

            <div className="rounded-lg bg-slate-800 p-4">
              <p className="text-sm text-slate-400">
                Sale Transactions
              </p>
              <p className="mt-2 text-2xl font-bold text-amber-400">
                {sellCount}
              </p>
            </div>
          </div>
        </section>

        <p className="text-xs text-slate-500">
          Analytics are calculated from manually recorded stock prices and
          transactions. Portfolio investment excludes transaction fees and
          taxes. Market values are not live NSE quotations.
        </p>
      </div>
    </main>
  );
}
