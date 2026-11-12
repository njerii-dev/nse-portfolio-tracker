
"use client";

import { useEffect, useState } from "react";

type Stock = {
  id: number;
  companyName: string;
  symbol: string;
  sector: string;
};

type DailyPrice = {
  id: number;
  stockId: number;
  companyName: string;
  symbol: string;
  date: string;
  opening: number;
  highest: number;
  lowest: number;
  closing: number;
  volume: number;
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

  // Load saved stocks and prices
  useEffect(() => {
    const savedStocks = localStorage.getItem("nse-stocks");
    const savedPrices = localStorage.getItem("nse-prices");

    if (savedStocks) {
      setStocks(JSON.parse(savedStocks));
    }

    if (savedPrices) {
      setPrices(JSON.parse(savedPrices));
    }
  }, []);

  // Record daily stock prices
  function handleAddPrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !stockId ||
      !date ||
      !opening ||
      !highest ||
      !lowest ||
      !closing ||
      !volume
    ) {
      setMessage("Please complete all fields.");
      return;
    }

    const selectedStock = stocks.find(
      (stock) => stock.id === Number(stockId)
    );

    if (!selectedStock) {
      setMessage("Please select a valid stock counter.");
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
      setMessage("Enter valid positive prices and a whole-number volume.");
      return;
    }

    if (
      high < Math.max(open, close, low) ||
      low > Math.min(open, close, high)
    ) {
      setMessage("Please check your highest and lowest prices.");
      return;
    }

    const duplicate = prices.some(
      (price) =>
        price.stockId === selectedStock.id && price.date === date
    );

    if (duplicate) {
      setMessage("A price record already exists for this stock on this date.");
      return;
    }

    const newPrice: DailyPrice = {
      id: Date.now(),
      stockId: selectedStock.id,
      companyName: selectedStock.companyName,
      symbol: selectedStock.symbol,
      date,
      opening: open,
      highest: high,
      lowest: low,
      closing: close,
      volume: tradedVolume,
    };

    const updatedPrices = [newPrice, ...prices];

    setPrices(updatedPrices);
    localStorage.setItem("nse-prices", JSON.stringify(updatedPrices));

    setDate("");
    setOpening("");
    setHighest("");
    setLowest("");
    setClosing("");
    setVolume("");

    setMessage("Daily stock price recorded successfully.");
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
          <h1 className="text-3xl font-bold">Daily Stock Prices</h1>
          <p className="mt-2 text-sm text-slate-500">
            Record and monitor daily trading prices for registered NSE counters.
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold">
            Record Daily Price
          </h2>

          {stocks.length === 0 ? (
            <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              No stock counters found. Please register a stock counter first.
            </p>
          ) : (
            <form onSubmit={handleAddPrice} className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Stock Counter
                </label>
                <select
                  value={stockId}
                  onChange={(event) => setStockId(event.target.value)}
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
                  className="w-full rounded-lg border border-slate-300 px-4 py-3"
                />
              </div>

              {[
                { label: "Opening Price (KES)", value: opening, setter: setOpening },
                { label: "Highest Price (KES)", value: highest, setter: setHighest },
                { label: "Lowest Price (KES)", value: lowest, setter: setLowest },
                { label: "Closing Price (KES)", value: closing, setter: setClosing },
                { label: "Trading Volume (Shares)", value: volume, setter: setVolume },
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
                    onChange={(event) => field.setter(event.target.value)}
                    placeholder="Enter value"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3"
                  />
                </div>
              ))}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  + Record Daily Price
                </button>
              </div>
            </form>
          )}

          {message && (
            <p className="mt-4 text-sm font-medium text-emerald-700">
              {message}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold">
            Recorded Daily Prices
          </h2>

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
                      {price.companyName}
                      <span className="ml-1 text-emerald-700">
                        ({price.symbol})
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

                {prices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
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
