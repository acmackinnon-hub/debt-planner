"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { buildPlan, type Debt, type Strategy } from "./lib/debt";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}
const STORAGE_KEY = "debt_planner_v1";

function loadSavedState() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
export default function Home() {
  const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);
  // "Paid" flag for now (we'll connect real payment after)
  const [isPro, setIsPro] = useState(false);

  const [strategy, setStrategy] = useState<Strategy>("avalanche");
  const [extraMonthly, setExtraMonthly] = useState(0);

  const [debts, setDebts] = useState<Debt[]>([
    { id: uid(), name: "Credit Card", balance: 5000, apr: 19.99, minPayment: 200 },
  ]);
  const didLoad = useRef(false);
useEffect(() => {
  const saved = loadSavedState();
  if (!saved) return;

  if (typeof saved.isPro === "boolean") setIsPro(saved.isPro);
  if (saved.strategy) setStrategy(saved.strategy);
  if (typeof saved.extraMonthly === "number")
    setExtraMonthly(saved.extraMonthly);
  if (Array.isArray(saved.debts))
    setDebts(saved.debts);
  didLoad.current = true;
}, []);

  const maxDebtsAllowed = isPro ? 50 : 1;
  const overLimit = debts.length > maxDebtsAllowed;

  useEffect(() => {
  // don't save until we've attempted to load once
  if (!didLoad.current) return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        isPro,
        strategy,
        extraMonthly,
        debts,
      })
    );
  } catch {
    // ignore write errors
  }
}, [isPro, strategy, extraMonthly, debts]);

  const result = useMemo(() => {
    // In free mode, only calculate using first debt
    const activeDebts = isPro ? debts : debts.slice(0, 1);
    return buildPlan({ debts: activeDebts, extraMonthly, strategy });
  }, [debts, extraMonthly, strategy, isPro]);

  function updateDebt(id: string, patch: Partial<Debt>) {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeDebt(id: string) {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  }

  function addDebt() {
    if (!isPro && debts.length >= 1) return;
    setDebts((prev) => [
      ...prev,
      { id: uid(), name: `Debt ${prev.length + 1}`, balance: 1000, apr: 12.99, minPayment: 50 },
    ]);
  }

  if (!mounted) return null;
  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 820, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>Debt Planner</h1>
        <div style={{ fontSize: 14, opacity: 0.85 }}>
          Mode: <b>{isPro ? "Pro" : "Free"}</b>
        </div>
      </header>

      {!isPro && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #333", borderRadius: 10 }}>
          <b>Free plan:</b> 1 debt only.{" "}
          <button
            onClick={() => setIsPro(true)}
            style={{ marginLeft: 8, padding: "6px 10px", cursor: "pointer" }}
          >
            Unlock Pro (one-time)
          </button>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
            (Payment isn’t wired yet — this button is a temporary “dev unlock.”)
          </div>
        </div>
      )}

      <section style={{ marginTop: 18 }}>
        <h2 style={{ marginBottom: 10 }}>Your Debts</h2>

        {debts.map((d, idx) => (
          <div
            key={d.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr auto",
              gap: 10,
              alignItems: "end",
              padding: 12,
              border: "1px solid #2b2b2b",
              borderRadius: 10,
              marginBottom: 10,
              opacity: !isPro && idx > 0 ? 0.5 : 1,
            }}
          >
            <label>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Name</div>
              <input
                value={d.name}
                onChange={(e) => updateDebt(d.id, { name: e.target.value })}
                style={{ width: "100%" }}
                disabled={!isPro && idx > 0}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Balance ($)</div>
              <input
                type="number"
                value={d.balance}
                onChange={(e) => updateDebt(d.id, { balance: Number(e.target.value) })}
                style={{ width: "100%" }}
                disabled={!isPro && idx > 0}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, opacity: 0.85 }}>APR (%)</div>
              <input
                type="number"
                value={d.apr}
                onChange={(e) => updateDebt(d.id, { apr: Number(e.target.value) })}
                style={{ width: "100%" }}
                disabled={!isPro && idx > 0}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Min Payment ($)</div>
              <input
                type="number"
                value={d.minPayment}
                onChange={(e) => updateDebt(d.id, { minPayment: Number(e.target.value) })}
                style={{ width: "100%" }}
                disabled={!isPro && idx > 0}
              />
            </label>

            <button
              onClick={() => removeDebt(d.id)}
              style={{ padding: "6px 10px", cursor: "pointer" }}
              disabled={debts.length === 1 || (!isPro && idx > 0)}
              title={debts.length === 1 ? "Keep at least one debt" : "Remove"}
            >
              Remove
            </button>
          </div>
        ))}

        <button onClick={addDebt} style={{ padding: "8px 12px", cursor: "pointer" }}>
          + Add Debt
        </button>

        {!isPro && (
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
            Free plan limit: 1 debt. Upgrade to add more.
          </div>
        )}

        {overLimit && (
          <div style={{ marginTop: 8, color: "tomato" }}>
            You’re over the free limit. Upgrade to calculate multiple debts.
          </div>
        )}
      </section>

      <section style={{ marginTop: 22 }}>
        <h2 style={{ marginBottom: 10 }}>Plan Settings</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 520 }}>
          <label>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Strategy</div>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as Strategy)}
              style={{ width: "100%" }}
            >
              <option value="avalanche">Avalanche (highest APR first)</option>
              <option value="snowball">Snowball (smallest balance first)</option>
            </select>
          </label>

          <label>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Extra Monthly Payment ($)</div>
            <input
              type="number"
              value={extraMonthly}
              onChange={(e) => setExtraMonthly(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </label>
        </div>
      </section>

      <section style={{ marginTop: 22, padding: 12, border: "1px solid #2b2b2b", borderRadius: 10 }}>
        <h2 style={{ marginTop: 0 }}>Results</h2>
        <p style={{ margin: "6px 0" }}>
          <b>Months to debt-free:</b> {result.months}
        </p>
        <p style={{ margin: "6px 0" }}>
          <b>Total interest:</b> ${result.totalInterest}
        </p>
        <p style={{ margin: "6px 0" }}>
          <b>Total paid:</b> ${result.totalPaid}
        </p>
        <p style={{ margin: "6px 0" }}>
          <b>Payoff order:</b> {
  result.payoffOrder
    ?.map((id) => debts.find((d) => d.id === id)?.name ?? id)
    .join(" → ") || "(calculating...)"
}
        </p>
      </section>
    </main>
  );
}