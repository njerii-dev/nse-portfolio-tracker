
"use client";

import { useCallback, useEffect, useState } from "react";

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
  opening: number;
  highest: number;
  lowest: number;
  closing: number;
  volume: number;
  stock: {
    companyName: string;
    symbol: string;
  };
};

export default function PricesPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [prices, setPrices] = useState<DailyPrice[]>([]);

  const [stockId, setStockId] = useState("");
  const [date, setDate] = useState("");
  const [opening, setOpening] = useState("");
  const [highest, setHighest] = useState("");
  const [lowest, setLowest] = useState("");
  const [closing, setClosing] = useState("");
  const [volume, setVolume] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load stocks and daily prices from Neon through our API.
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [stocksResponse, pricesResponse] = await Promise.all([
        fetch("/api/stocks", { cache: "no-store" }),
        fetch("/api/prices", { cache: "no-store" }),
      ]);

      const stocksData = await stocksResponse.json();
      const pricesData = await pricesResponse.json();

      if (!stocksResponse.ok) {
        throw new Error(
          stocksData.error || "Failed to load stock counters."
        );
      }

      if (!pricesResponse.ok) {
        throw new Error(
          pricesData.error || "Failed to load daily prices."
        );
      }

      const formattedPrices: DailyPrice[] = pricesData.map(
        (price: any) => ({
          id: price.id,
          stockId: price.stockId,
          date: String(price.date).slice(0, 10),
          opening: Number(price.opening),
          highest: Number(price.highest),
          lowest: Number(price.lowest),
          closing: Number(price.closing),
          volume: Number(price.volume),
          stock: {
            companyName: price.stock.companyName,
            symbol: price.stock.symbol,
          },
        })
      );

      setStocks(stocksData);
      setPrices(formattedPrices);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Record a daily stock price in Neon.
  async function handleAddPrice(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (
      !stockId ||
      !date ||
      !opening ||
      !highest ||
      !lowest ||
      !closing ||
      volume === ""
    ) {
      setError("Please complete all fields.");
      return;
    }

    const open = Number(opening);
    const high = Number(highest);
    const low = Number(lowest);
    const close = Number(closing);
    const tradedVolume = Number(volume);

    if (
      ![open, high, low, close, tradedVolume].every(Number.isFinite) ||
      [open, high, low, close].some((price) => price <= 0) ||
      !Number.isSafeInteger(tradedVolume) ||
      tradedVolume < 0
    ) {
      setError(
        "Enter valid positive prices and a whole-number volume."
      );
      return;
    }

    if (
      high < Math.max(open, close, low) ||
      low > Math.min(open, close, high)
    ) {
      setError("Please check your highest and lowest prices.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/prices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stockId,
          date,
          opening: open,
          highest: high,
          lowest: low,
          closing: close,
          volume: tradedVolume,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to record daily price."
        );
      }

      setMessage("Daily stock price recorded successfully.");

      setDate("");
      setOpening("");
      setHighest("");
      setLowest("");
      setClosing("");
      setVolume("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the price."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 md:p-10">
      <div className="mx-auto max-w-6xl">
        <a
          href="/"
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Back to Dashboard
        </a>

        <header className="mb-8 mt-6">
          <h1 className="text-3xl font-bold">
            Daily Stock Prices
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Record and monitor daily trading prices for registered NSE counters.
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold">
            Record Daily Price
          </h2>

          {loading ? (
            <p className="text-sm text-slate-500">
              Loading stock counters...
            </p>
          ) : stocks.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              No stock counters found. Please register a stock counter first.
            </p>
          ) : (
            <form
              onSubmit={handleAddPrice}
              className="grid gap-5 md:grid-cols-2"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Stock Counter
                </label>

                <select
                  value={stockId}
                  onChange={(event) => setStockId(event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                >
                  <option value="">Select a company</option>

                  {stocks.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.companyName} ({stock.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Trading Date
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </div>

              {[
                {
                  label: "Opening Price (KES)",
                  value: opening,
                  setter: setOpening,
                },
                {
                  label: "Highest Price (KES)",
                  value: highest,
                  setter: setHighest,
                },
                {
                  label: "Lowest Price (KES)",
                  value: lowest,
                  setter: setLowest,
                },
                {
                  label: "Closing Price (KES)",
                  value: closing,
                  setter: setClosing,
                },
                {
                  label: "Trading Volume (Shares)",
                  value: volume,
                  setter: setVolume,
                },
              ].map((field) => (
                <div key={field.label}>
                  <label className="mb-2 block text-sm font-medium">
                    {field.label}
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={field.value}
                    onChange={(event) =>
                      field.setter(event.target.value)
                    }
                    placeholder="Enter value"
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                  />
                </div>
              ))}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "+ Record Daily Price"}
                </button>
              </div>
            </form>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {message && (
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {message}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Recorded Daily Prices
            </h2>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-4">Company</th>
                  <th className="pb-4">Date</th>
                  <th className="pb-4">Opening</th>
                  <th className="pb-4">Highest</th>
                  <th className="pb-4">Lowest</th>
                  <th className="pb-4">Closing</th>
                  <th className="pb-4">Volume</th>
                </tr>
              </thead>

              <tbody>
                {prices.map((price) => (
                  <tr key={price.id} className="border-b border-slate-100">
                    <td className="py-4 font-medium">
                      {price.stock.companyName}
                      <span className="ml-1 text-emerald-700">
                        ({price.stock.symbol})
                      </span>
                    </td>

                    <td className="py-4">{price.date}</td>
                    <td className="py-4">{price.opening.toFixed(2)}</td>
                    <td className="py-4">{price.highest.toFixed(2)}</td>
                    <td className="py-4">{price.lowest.toFixed(2)}</td>

                    <td className="py-4 font-semibold">
                      {price.closing.toFixed(2)}
                    </td>

                    <td className="py-4">
                      {price.volume.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {!loading && prices.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-500"
                    >
                      No daily prices recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
