import { MotorRate } from "@/types";

export const approvedCompanies = [
  "AUROBINDO",
  "APITORIA",
  "EUGIA",
  "AURO PEPTIDES",
  "APL HEALTH CARE",
  "APL RESEARCH CENTER"
];

export const motorRates: MotorRate[] = [
  { hp: "0.25 HP", rpm1440: 1180, rpm960: 1290 },
  { hp: "0.5 HP", rpm1440: 1180, rpm960: 1290 },
  { hp: "1 HP", rpm1440: 1574, rpm960: 1719 },
  { hp: "1.5 HP", rpm1440: 1574, rpm960: 1719 },
  { hp: "2 HP", rpm1440: 2125, rpm960: 2325 },
  { hp: "3 HP", rpm1440: 2457, rpm960: 2708 },
  { hp: "5 HP", rpm1440: 3778, rpm960: 4126 },
  { hp: "7.5 HP", rpm1440: 4406, rpm960: 4838 },
  { hp: "10 HP", rpm1440: 5661, rpm960: 6772 },
  { hp: "12.5 HP", rpm1440: 6169, rpm960: 0 },
  { hp: "15 HP", rpm1440: 7081, rpm960: 7739 },
  { hp: "20 HP", rpm1440: 8896, rpm960: 9286 },
  { hp: "25 HP", rpm1440: 9495, rpm960: 11222 },
  { hp: "30 HP", rpm1440: 11824, rpm960: 13974 },
  { hp: "40 HP", rpm1440: 15801, rpm960: 16985 },
  { hp: "50 HP", rpm1440: 19380, rpm960: 21286 },
  { hp: "60 HP", rpm1440: 20318, rpm960: 0 },
  { hp: "75 HP", rpm1440: 28665, rpm960: 27861 },
  { hp: "100 HP", rpm1440: 47693, rpm960: 0 },
  { hp: "125 HP", rpm1440: 82944, rpm960: 0 }
];

export interface MotorSuggestion {
  name: string;
  hsn: string;
  price: number;
  quantityUnit: string;
  hp: string;
  rpm: string;
}

/**
 * Returns auto-suggestions matching user query (by HP number, RPM, or keyword like "motor", "rewinding")
 */
export function getMotorSuggestions(query: string): MotorSuggestion[] {
  if (!query || !query.trim()) {
    // Return most popular common HP rates as initial suggestions
    return [
      { name: "REWINDING OF 1.5 HP MOTOR (1440/2880 RPM)", hsn: "9987", price: 1574, quantityUnit: "NOS", hp: "1.5 HP", rpm: "1440/2880 RPM" },
      { name: "REWINDING OF 2 HP MOTOR (1440/2880 RPM)", hsn: "9987", price: 2125, quantityUnit: "NOS", hp: "2 HP", rpm: "1440/2880 RPM" },
      { name: "REWINDING OF 3 HP MOTOR (1440/2880 RPM)", hsn: "9987", price: 2457, quantityUnit: "NOS", hp: "3 HP", rpm: "1440/2880 RPM" },
      { name: "REWINDING OF 5 HP MOTOR (1440/2880 RPM)", hsn: "9987", price: 3778, quantityUnit: "NOS", hp: "5 HP", rpm: "1440/2880 RPM" },
      { name: "REWINDING OF 7.5 HP MOTOR (1440/2880 RPM)", hsn: "9987", price: 4406, quantityUnit: "NOS", hp: "7.5 HP", rpm: "1440/2880 RPM" },
      { name: "REWINDING OF 10 HP MOTOR (1440/2880 RPM)", hsn: "9987", price: 5661, quantityUnit: "NOS", hp: "10 HP", rpm: "1440/2880 RPM" }
    ];
  }

  const q = query.toLowerCase().trim();
  const results: MotorSuggestion[] = [];

  // Extract number from query if user typed e.g. "5", "7.5", "5hp", "0.5"
  const hpMatch = q.match(/(\d+(?:\.\d+)?)/);
  const hpNum = hpMatch ? hpMatch[1] : '';

  for (const item of motorRates) {
    const rawHp = item.hp.replace(/\s*HP/i, '').trim();
    const isHpMatch = hpNum && (rawHp === hpNum || rawHp.startsWith(hpNum) || item.hp.toLowerCase().includes(q));
    const isGeneralMatch = q.includes("motor") || q.includes("rewind") || q.includes("hp") || item.hp.toLowerCase().includes(q);

    if (isHpMatch || isGeneralMatch) {
      // 1440/2880 RPM option
      if (item.rpm1440 > 0 && !q.includes("960")) {
        results.push({
          name: `REWINDING OF ${item.hp} MOTOR (1440/2880 RPM)`,
          hsn: "9987",
          price: item.rpm1440,
          quantityUnit: "NOS",
          hp: item.hp,
          rpm: "1440/2880 RPM"
        });
      }

      // 960 RPM option
      if (item.rpm960 > 0 && (!q.includes("1440") && !q.includes("2880"))) {
        results.push({
          name: `REWINDING OF ${item.hp} MOTOR (960 RPM)`,
          hsn: "9987",
          price: item.rpm960,
          quantityUnit: "NOS",
          hp: item.hp,
          rpm: "960 RPM"
        });
      }
    }
  }

  return results.slice(0, 10);
}

/**
 * Automatically parses text for HP rating and returns the approved price & HSN 9987
 */
export function findMotorPrice(text: string): { price: number; hsn: string; hp: string; rpm: string } | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Look for patterns like "5 HP", "5.5 HP", "5HP", "5 H.P.", "0.25 HP", "12.5HP"
  const match = lower.match(/(?:^|\s|[(\[-])(\d+(?:\.\d+)?)\s*(?:hp|h\.p\b|horse\s*power)/i);
  if (!match) return null;

  const numericHp = parseFloat(match[1]);
  if (isNaN(numericHp)) return null;

  // Find exact rate item
  const found = motorRates.find(r => {
    const itemNum = parseFloat(r.hp.replace(/\s*HP/i, ''));
    return Math.abs(itemNum - numericHp) < 0.01;
  });

  if (!found) return null;

  const is960 = lower.includes("960");
  if (is960 && found.rpm960 > 0) {
    return {
      price: found.rpm960,
      hsn: "9987",
      hp: found.hp,
      rpm: "960 RPM"
    };
  }

  return {
    price: found.rpm1440,
    hsn: "9987",
    hp: found.hp,
    rpm: "1440/2880 RPM"
  };
}
