// Code written by Kone & Claude | The code does the following: " Currency helpers for the dual USD/ZAR
// cost display in Settings. Costs are always stored in USD internally; this module converts for display
// using the USD_ZAR_RATE env value (default 18.5). "

export type DisplayCurrency = 'USD' | 'ZAR';

export function usdToZar(usd: number, rate: number): number {
  return Number((usd * rate).toFixed(4));
}

export function formatMoney(amount: number, currency: DisplayCurrency): string {
  if (currency === 'ZAR') return `R ${amount.toFixed(2)}`;
  return `$${amount.toFixed(2)}`;
}

export function budgetForCurrency(settings: { monthlyBudgetUsd: number; monthlyBudgetZar: number }, currency: DisplayCurrency): number {
  return currency === 'ZAR' ? settings.monthlyBudgetZar : settings.monthlyBudgetUsd;
}
