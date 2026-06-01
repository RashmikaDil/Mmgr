"use client";
import { useCurrency } from "@/context/CurrencyContext";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export const CURRENCIES = [
  { code: "USD", label: "US Dollar",           symbol: "$"  },
  { code: "EUR", label: "Euro",                symbol: "€"  },
  { code: "GBP", label: "British Pound",       symbol: "£"  },
  { code: "INR", label: "Indian Rupee",        symbol: "₹"  },
  { code: "JPY", label: "Japanese Yen",        symbol: "¥"  },
  { code: "AUD", label: "Australian Dollar",   symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar",     symbol: "C$" },
  { code: "CHF", label: "Swiss Franc",         symbol: "Fr" },
  { code: "CNY", label: "Chinese Yuan",        symbol: "¥"  },
  { code: "SGD", label: "Singapore Dollar",    symbol: "S$" },
  { code: "AED", label: "UAE Dirham",          symbol: "د.إ"},
  { code: "SAR", label: "Saudi Riyal",         symbol: "﷼"  },
  { code: "MYR", label: "Malaysian Ringgit",   symbol: "RM" },
  { code: "THB", label: "Thai Baht",           symbol: "฿"  },
  { code: "IDR", label: "Indonesian Rupiah",   symbol: "Rp" },
  { code: "KRW", label: "South Korean Won",    symbol: "₩"  },
  { code: "HKD", label: "Hong Kong Dollar",    symbol: "HK$"},
  { code: "NZD", label: "New Zealand Dollar",  symbol: "NZ$"},
  { code: "ZAR", label: "South African Rand",  symbol: "R"  },
  { code: "BRL", label: "Brazilian Real",      symbol: "R$" },
  { code: "MXN", label: "Mexican Peso",        symbol: "$"  },
  { code: "SEK", label: "Swedish Krona",       symbol: "kr" },
  { code: "NOK", label: "Norwegian Krone",     symbol: "kr" },
  { code: "DKK", label: "Danish Krone",        symbol: "kr" },
  { code: "PLN", label: "Polish Zloty",        symbol: "zł" },
  { code: "TRY", label: "Turkish Lira",        symbol: "₺"  },
  { code: "PHP", label: "Philippine Peso",     symbol: "₱"  },
  { code: "PKR", label: "Pakistani Rupee",     symbol: "₨"  },
  { code: "BDT", label: "Bangladeshi Taka",    symbol: "৳"  },
  { code: "LKR", label: "Sri Lankan Rupee",    symbol: "Rs" },
];

interface Props {
  /** compact = small trigger used in the topbar; full = used in settings */
  variant?: "compact" | "full";
}

export function CurrencySwitcher({ variant = "compact" }: Props) {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
      <SelectTrigger className={variant === "compact" ? "w-[90px] h-8 text-xs" : "w-full"}>
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent className="max-h-72 overflow-y-auto">
        {CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="font-mono text-xs text-gray-500 mr-2">{c.symbol}</span>
            {c.code}
            {variant === "full" && (
              <span className="ml-2 text-gray-400 text-xs">— {c.label}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
