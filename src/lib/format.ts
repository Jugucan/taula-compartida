const euro = new Intl.NumberFormat("ca-ES", { style: "currency", currency: "EUR" });
export const formatEuro = (n: number) => euro.format(n);
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
