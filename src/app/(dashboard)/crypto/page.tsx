"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCryptoStore } from "@/store/cryptoStore";
import { useCurrency } from "@/context/CurrencyContext";
import { fetchCryptoPricesUSD, type CoinPrice } from "@/services/cryptoService";
import type { CryptoHolding } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bitcoin, PlusCircle, TrendingUp, TrendingDown, Pencil, Trash2, RefreshCw, AlertCircle, Loader2, Coins } from "lucide-react";

// ── Popular coins ─────────────────────────────────────────────────────────────
const POPULAR_COINS = [
  { id: "bitcoin",       symbol: "BTC",  name: "Bitcoin"    },
  { id: "ethereum",      symbol: "ETH",  name: "Ethereum"   },
  { id: "tether",        symbol: "USDT", name: "Tether"     },
  { id: "binancecoin",   symbol: "BNB",  name: "BNB"        },
  { id: "solana",        symbol: "SOL",  name: "Solana"     },
  { id: "ripple",        symbol: "XRP",  name: "XRP"        },
  { id: "cardano",       symbol: "ADA",  name: "Cardano"    },
  { id: "avalanche-2",   symbol: "AVAX", name: "Avalanche"  },
  { id: "dogecoin",      symbol: "DOGE", name: "Dogecoin"   },
  { id: "polkadot",      symbol: "DOT",  name: "Polkadot"   },
  { id: "matic-network", symbol: "MATIC",name: "Polygon"    },
  { id: "chainlink",     symbol: "LINK", name: "Chainlink"  },
  { id: "shiba-inu",     symbol: "SHIB", name: "Shiba Inu"  },
  { id: "litecoin",      symbol: "LTC",  name: "Litecoin"   },
  { id: "uniswap",       symbol: "UNI",  name: "Uniswap"    },
  { id: "custom",        symbol: "",     name: "Custom…"    },
];

const COIN_COLORS: Record<string, string> = {
  bitcoin: "#f7931a", ethereum: "#627eea", tether: "#26a17b",
  binancecoin: "#f3ba2f", solana: "#9945ff", ripple: "#346aa9",
  cardano: "#0033ad", "avalanche-2": "#e84142", dogecoin: "#c2a633",
  polkadot: "#e6007a", "matic-network": "#8247e5", chainlink: "#375bd2",
  "shiba-inu": "#ffa409", litecoin: "#bfbbbb", uniswap: "#ff007a",
};

const EMPTY_FORM = { selectedCoinId: "", customId: "", name: "", symbol: "", quantity: "", purchaseDate: new Date().toISOString().slice(0, 10) };

export default function CryptoPage() {
  const { user } = useAuth();
  const { currency, exchangeRates, formatPrice } = useCurrency();
  const { holdings, loading, error: storeError, fetchHoldings, addHolding, updateHolding, deleteHolding } = useCryptoStore();

  const [prices, setPrices] = useState<Record<string, CoinPrice>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CryptoHolding | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const toSelectedCurrency = (usd: number) => usd * (exchangeRates[currency] ?? 1);

  const getHoldingStats = (h: CryptoHolding) => {
    const p = prices[h.coinId];
    if (!p) return null;
    const valueUSD = h.quantity * p.usd;
    return { 
      priceUSD: p.usd, 
      priceCurrency: toSelectedCurrency(p.usd),
      valueUSD, 
      valueCurrency: toSelectedCurrency(valueUSD), 
      change24h: p.usd_24h_change ?? 0 
    };
  };

  const totalValueUSD = holdings.reduce((s, h) => {
    const p = prices[h.coinId];
    return s + (p ? h.quantity * p.usd : 0);
  }, 0);

  const bestPerformer = holdings.reduce<{ name: string; change: number } | null>((best, h) => {
    const p = prices[h.coinId];
    if (!p) return best;
    if (!best || p.usd_24h_change > best.change) return { name: h.name, change: p.usd_24h_change ?? 0 };
    return best;
  }, null);

  // ── data loading ──────────────────────────────────────────────────────────────
  const loadPrices = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setPricesLoading(true);
    setPriceError(null);
    try {
      const data = await fetchCryptoPricesUSD(ids);
      setPrices((prev) => ({ ...prev, ...data }));
    } catch (e: any) {
      setPriceError("Could not fetch live prices. Rates may be delayed.");
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    fetchHoldings(user.uid);
  }, [user?.uid, fetchHoldings]);

  useEffect(() => {
    if (holdings.length > 0) loadPrices(holdings.map((h) => h.coinId));
  }, [holdings, loadPrices]);

  // ── dialog helpers ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (h: CryptoHolding) => {
    setEditing(h);
    const known = POPULAR_COINS.find((c) => c.id === h.coinId);
    setForm({
      selectedCoinId: known ? h.coinId : "custom",
      customId: known ? "" : h.coinId,
      name: h.name,
      symbol: h.symbol,
      quantity: String(h.quantity),
      purchaseDate: h.purchaseDate,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleCoinSelect = (id: string | null) => {
    if (!id) return;
    if (id === "custom") {
      setForm((f) => ({ ...f, selectedCoinId: "custom", name: "", symbol: "", customId: "" }));
      return;
    }
    const coin = POPULAR_COINS.find((c) => c.id === id);
    if (coin) setForm((f) => ({ ...f, selectedCoinId: id, name: coin.name, symbol: coin.symbol, customId: "" }));
  };

  const effectiveCoinId = form.selectedCoinId === "custom" ? form.customId.trim().toLowerCase() : form.selectedCoinId;

  const handleSubmit = async () => {
    if (!user?.uid) return;
    if (!effectiveCoinId) { setFormError("Please select or enter a coin."); return; }
    if (!form.name.trim()) { setFormError("Coin name is required."); return; }
    if (!form.symbol.trim()) { setFormError("Symbol is required."); return; }
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) { setFormError("Quantity must be a positive number."); return; }

    setSaving(true);
    setFormError(null);
    const payload = {
      userId: user.uid,
      coinId: effectiveCoinId,
      name: form.name.trim(),
      symbol: form.symbol.trim().toUpperCase(),
      quantity: qty,
      purchaseDate: form.purchaseDate,
    };
    try {
      if (editing) {
        await updateHolding(editing.id, payload);
        setSuccessMsg("Holding updated!");
      } else {
        await addHolding(payload);
        setSuccessMsg("Holding added!");
      }
      // fetch price for the new coin if not already loaded
      await loadPrices([effectiveCoinId]);
      setDialogOpen(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setFormError(e.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this holding? This cannot be undone.")) return;
    await deleteHolding(id);
  };

  const handleRefresh = async () => {
    if (!user?.uid) return;
    await fetchHoldings(user.uid);
    if (holdings.length > 0) await loadPrices(holdings.map((h) => h.coinId));
  };

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bitcoin className="w-8 h-8 text-amber-500" />
            Crypto Portfolio
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track your crypto holdings — values shown in your selected currency.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading || pricesLoading} title="Refresh prices">
            <RefreshCw className={`w-4 h-4 ${(loading || pricesLoading) ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={openAdd} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
            <PlusCircle className="w-4 h-4" />
            Add Coin
          </Button>
        </div>
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 text-sm">
          {successMsg}
        </div>
      )}
      {(storeError || priceError) && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {storeError || priceError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-800/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Total Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              {pricesLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatPrice(toSelectedCurrency(totalValueUSD))}
            </div>
            {currency !== "USD" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">${totalValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{holdings.length}</div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">unique coins tracked</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/30 dark:to-green-800/20 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Best 24h</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {bestPerformer ? `${bestPerformer.change >= 0 ? "+" : ""}${bestPerformer.change.toFixed(2)}%` : "—"}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{bestPerformer?.name ?? "No data yet"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Loading skeleton */}
      {loading && holdings.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && holdings.length === 0 && (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-gray-400">
            <Coins className="w-12 h-12 opacity-30" />
            <p className="text-lg font-medium">No coins yet</p>
            <p className="text-sm">Add your first crypto holding to start tracking your portfolio.</p>
            <Button variant="outline" onClick={openAdd} className="mt-2 gap-2">
              <PlusCircle className="w-4 h-4" /> Add Coin
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Holdings list */}
      {holdings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="w-4 h-4" /> Your Holdings
            </CardTitle>
            <CardDescription>Live prices from CoinGecko · Values in {currency}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {holdings.map((h) => {
              const stats = getHoldingStats(h);
              const color = COIN_COLORS[h.coinId] ?? "#94a3b8";
              const isUp = (stats?.change24h ?? 0) >= 0;
              return (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: color }}>
                      {h.symbol.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{h.name} <span className="text-gray-400 font-normal">({h.symbol})</span></p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {h.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })} coins
                        {stats ? ` · ${formatPrice(stats.priceCurrency)} / coin` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      {pricesLoading && !stats ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : stats ? (
                        <>
                          <p className="font-semibold text-sm">{formatPrice(stats.valueCurrency)}</p>
                          <p className={`text-xs flex items-center justify-end gap-0.5 ${isUp ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isUp ? "+" : ""}{stats.change24h.toFixed(2)}% 24h
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">Price unavailable</p>
                      )}
                    </div>
                    <div className="hidden group-hover:flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(h)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(h.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setFormError(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Holding" : "Add Crypto Coin"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update your coin quantity or details." : "Select a coin and enter how many you hold."}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {formError}
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Coin selector */}
            <div className="space-y-1.5">
              <Label>Coin</Label>
              <Select value={form.selectedCoinId} onValueChange={handleCoinSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a coin" />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_COINS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.symbol ? ` (${c.symbol})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom coin fields */}
            {form.selectedCoinId === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="coin-id">CoinGecko ID</Label>
                  <Input id="coin-id" placeholder="e.g. bitcoin" value={form.customId}
                    onChange={(e) => setForm((f) => ({ ...f, customId: e.target.value.toLowerCase().trim() }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="coin-symbol">Symbol</Label>
                  <Input id="coin-symbol" placeholder="e.g. BTC" value={form.symbol}
                    onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="coin-name">Coin Name</Label>
                  <Input id="coin-name" placeholder="e.g. Bitcoin" value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
              </div>
            )}

            {/* Quantity + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="coin-qty">Quantity (coins)</Label>
                <Input id="coin-qty" type="number" min="0" step="any" placeholder="0.5"
                  value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coin-date">Purchase Date</Label>
                <Input id="coin-date" type="date" value={form.purchaseDate}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : editing ? "Save Changes" : "Add Holding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
