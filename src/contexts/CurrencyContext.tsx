import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Currency = "SAR" | "USD";

const EXCHANGE_RATE = 3.75; // 1 USD = 3.75 SAR

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Convert a SAR amount to the active currency */
  convert: (sarAmount: number) => number;
  /** Format a SAR amount in the active currency (number only, no symbol) */
  formatPrice: (sarAmount: number) => string;
  /** The symbol/label for the active currency */
  symbol: Currency;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "SAR",
  setCurrency: () => {},
  convert: (v) => v,
  formatPrice: (v) => v.toLocaleString("en-US"),
  symbol: "SAR",
});

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem("taqbeel_currency");
    return saved === "USD" ? "USD" : "SAR";
  });

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("taqbeel_currency", c);
  };

  const convert = (sarAmount: number): number => {
    if (currency === "USD") return sarAmount / EXCHANGE_RATE;
    return sarAmount;
  };

  const formatPrice = (sarAmount: number): string => {
    const converted = convert(sarAmount);
    if (currency === "USD") {
      return converted.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return converted.toLocaleString("en-US");
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, formatPrice, symbol: currency }}>
      {children}
    </CurrencyContext.Provider>
  );
};
