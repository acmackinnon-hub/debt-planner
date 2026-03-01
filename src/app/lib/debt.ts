export type Debt = {
  id: string;
  name: string;
  balance: number;     // dollars
  apr: number;         // percent, e.g. 19.99
  minPayment: number;  // dollars
};

export type Strategy = "avalanche" | "snowball";

export type PlanResult = {
  months: number;
  totalInterest: number;
  totalPaid: number;
  payoffOrder: string[];
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function monthlyRate(aprPct: number) {
  return aprPct / 100 / 12;
}

function sortDebts(debts: Debt[], strategy: Strategy) {
  const copy = [...debts];
  copy.sort((a, b) => {
    if (strategy === "avalanche") {
      if (b.apr !== a.apr) return b.apr - a.apr;
      return b.balance - a.balance;
    }
    // snowball: smallest balance first
    if (a.balance !== b.balance) return a.balance - b.balance;
    return b.apr - a.apr;
  });
  return copy;
}

export function buildPlan(opts: {
  debts: Debt[];
  extraMonthly: number;
  strategy: Strategy;
  maxMonths?: number;
}): PlanResult {
  const maxMonths = opts.maxMonths ?? 600;

  const state = opts.debts.map((d) => ({
    ...d,
    balance: Math.max(0, d.balance),
    minPayment: Math.max(0, d.minPayment),
  }));

  let totalInterest = 0;
  let totalPaid = 0;
  const payoffOrder: string[] = [];

  for (let m = 0; m < maxMonths; m++) {
    const remaining = state.filter((d) => d.balance > 0.005);
    if (remaining.length === 0) {
      return {
        months: m,
        totalInterest: round2(totalInterest),
        totalPaid: round2(totalPaid),
        payoffOrder,
      };
    }

    // interest this month
    const interestById = new Map<string, number>();
    for (const d of state) {
      if (d.balance <= 0.005) {
        interestById.set(d.id, 0);
        continue;
      }
      interestById.set(d.id, d.balance * monthlyRate(d.apr));
    }

    // minimum payments
    const paymentById = new Map<string, number>();
    for (const d of state) {
      if (d.balance <= 0.005) {
        paymentById.set(d.id, 0);
        continue;
      }
      const interest = interestById.get(d.id)!;
      const due = d.balance + interest;
      paymentById.set(d.id, Math.min(due, d.minPayment));
    }

    // apply extra to priority debt
    let extra = Math.max(0, opts.extraMonthly);
    while (extra > 0.005) {
      const active = state.filter((d) => d.balance > 0.005);
      if (active.length === 0) break;

      const target = sortDebts(active, opts.strategy)[0];
      const interest = interestById.get(target.id)!;
      const alreadyPaying = paymentById.get(target.id)!;

      const due = target.balance + interest;
      const remainingDue = Math.max(0, due - alreadyPaying);
      if (remainingDue <= 0.005) break;

      const add = Math.min(extra, remainingDue);
      paymentById.set(target.id, alreadyPaying + add);
      extra -= add;
    }

    // apply month payments
    for (const d of state) {
      if (d.balance <= 0.005) continue;

      const interest = interestById.get(d.id)!;
      const payment = paymentById.get(d.id)!;

      const due = d.balance + interest;
      const endBal = Math.max(0, due - payment);

      totalInterest += interest;
      totalPaid += payment;

      if (endBal <= 0.005 && !payoffOrder.includes(d.id)) payoffOrder.push(d.id);

      d.balance = endBal;
    }
  }

  return {
    months: maxMonths,
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    payoffOrder,
  };
}