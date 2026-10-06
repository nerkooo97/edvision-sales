// Number format used inside the contract text. (Dates use formatDay from ../compute.)

/** "1.234,50": always two decimals, dot for thousands, comma for decimals (the way the templates write "0,00"). */
export function formatAmount(value: number): string {
  const [whole, decimals] = value.toFixed(2).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimals}`;
}
