
"use client";

import { useEffect, useState } from "react";

type Stock = {
  id: string;
  companyName: string;
  symbol: string;
  sector: string;
  createdAt: string;
};

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [sector, setSector] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Retrieve stocks from Neon through our API
  async function fetchStocks() {
    try {
      setError("");

      const response = await fetch("/api/stocks");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load stocks.");
      }

      setStocks(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStocks();
  }, []);

  // Register a new stock in Neon
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!companyName.trim() || !symbol.trim() || !sector.trim()) {
      setError("Please complete all fields.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/stocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          symbol,
          sector,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register stock.");
      }

      setStocks((previousStocks) => [data, ...previousStocks]);

      setCompanyName("");
      setSymbol("");
      setSector("");

      setSuccess(`${data.companyName} registered successfully in Neon.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete a stock from Neon
  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${name}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(id);

    try {
      const response = await fetch(`/api/stocks/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete stock.");
      }

      setStocks((previousStocks) =>
        previousStocks.filter((stock) => stock.id !== id)
      );

      setSuccess(data.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            SokoTrack
          </p>

          <h1 className="mt-2 text-3xl font-bold">
          SokoTrack Counter Management
          </h1>

          <p className="mt-2 text-slate-400">
            Register and manage Nairobi Securities Exchange stock counters.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Registered Counters</p>
            <h2 className="mt-2 text-3xl font-bold">
              {stocks.length}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Database</p>
            <h2 className="mt-2 text-xl font-semibold text-emerald-400">
              Neon PostgreSQL
            </h2>
          </div>
        </div>

        <div className="mb-10 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-6 text-xl font-semibold">
            Register a New Stock
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-3">

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Company Name
                </label>

                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Safaricom PLC"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Stock Symbol
                </label>

                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g. SCOM"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 uppercase outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Sector
                </label>

                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="e.g. Telecommunications"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Registering..." : "Register Stock"}
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 text-emerald-300">
            {success}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

          <div className="flex items-center justify-between border-b border-slate-800 p-6">
            <h2 className="text-xl font-semibold">
              Registered Stocks
            </h2>

            <button
              onClick={fetchStocks}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="p-8 text-center text-slate-400">
              Loading stocks from Neon...
            </p>
          ) : stocks.length === 0 ? (
            <p className="p-8 text-center text-slate-400">
              No stocks registered yet. Use the form above to add your first stock.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">

                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Company Name</th>
                    <th className="px-6 py-4">Symbol</th>
                    <th className="px-6 py-4">Sector</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {stocks.map((stock) => (
                    <tr
                      key={stock.id}
                      className="border-t border-slate-800"
                    >
                      <td className="px-6 py-4 font-medium">
                        {stock.companyName}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-md bg-emerald-950 px-3 py-1 font-semibold text-emerald-400">
                          {stock.symbol}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {stock.sector}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            handleDelete(stock.id, stock.companyName)
                          }
                          disabled={deletingId === stock.id}
                          className="text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          {deletingId === stock.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}

        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Stock records are retrieved and stored in your Neon PostgreSQL database.
        </p>

      </div>
    </main>
  );
}
