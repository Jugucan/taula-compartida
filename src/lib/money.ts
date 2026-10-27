// Imports en cèntims enters. Mai es fan servir decimals per als càlculs.

/** Converteix el que escriu l'usuari ("12,5", "12.50", "12") a cèntims. Retorna null si no és vàlid. */
export function parseEuroToCents(input: string): number | null {
  const text = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(text)) return null;
  const [euros = "0", decimals = ""] = text.split(".");
  return Number(euros) * 100 + Number(decimals.padEnd(2, "0"));
}

/** Converteix cèntims a text editable ("1250" -> "12,50"). */
export function centsToInput(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return `${euros},${rest}`;
}
