export type WalletType = 'Cash' | 'Bank Account' | 'Digital Wallet' | 'Investment Account' | 'Other' | 'Fixed Deposit' | 'Savings Account';

export interface Wallet {
  id: string;
  userId: string;
  familyId?: string;
  name: string;
  type: WalletType;
  balance: number;
  currency: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  familyId?: string;
  createdAt: string;
  settings: Record<string, any>;
}

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  color: string;
  icon?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  familyId?: string;
  walletId: string;
  type: TransactionType;
  title: string;
  amount: number;
  categoryId: string;
  date: string;
  notes?: string;
  isRecurring: boolean;
  receiptUrl?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  familyId?: string;
  categoryId: string; // The expense category ID
  amount: number; // The budgeted amount
  month: number; // 1-12
  year: number;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  familyId?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface Investment {
  id: string;
  userId: string;
  familyId?: string;
  name: string;
  symbol?: string;          // e.g. "BTC", "ETH", "RELIANCE"
  type: 'Stocks' | 'Mutual Funds' | 'Crypto' | 'Gold' | 'Other';
  amountInvested: number;
  currentValue: number;
  purchaseDate: string;
  createdAt: string;
}

export interface CryptoHolding {
  id: string;
  userId: string;
  familyId?: string;
  name: string;         // e.g. "Bitcoin"
  coinId: string;       // CoinGecko ID, e.g. "bitcoin"
  symbol: string;       // e.g. "BTC"
  quantity: number;     // how many coins held
  totalInvestedUSD?: number; // Total amount invested (stored in USD to handle currency switching)
  purchaseDate: string; // YYYY-MM-DD
  createdAt: string;
}

/** A single tier rule: if balance/principal exceeds `aboveAmount`, apply `rate` */
export interface InterestTier {
  aboveAmount: number;  // threshold (e.g. 10000)
  rate: number;         // interest rate at this tier (% per rateFrequency)
}

export interface FixedDeposit {
  id: string;
  userId: string;
  familyId?: string;
  name: string;
  bankName?: string;
  principal: number;
  minimumDeposit?: number;           // minimum opening amount required by the bank
  interestRate: number;              // base rate
  rateFrequency: 'monthly' | 'quarterly' | 'annual'; // how often interest is calculated
  interestType: 'simple' | 'compound';
  interestTiers?: InterestTier[];    // bonus tier rules (e.g. > ₹10 000 → 1%)
  startDate: string;                 // YYYY-MM-DD
  maturityDate: string;              // YYYY-MM-DD
  status: 'active' | 'matured' | 'closed';
  createdAt: string;
}

export interface SavingsAccount {
  id: string;
  userId: string;
  familyId?: string;
  name: string;
  bankName?: string;
  balance: number;
  minimumDeposit?: number;           // minimum balance required (to avoid fees or earn interest)
  interestRate?: number;             // base interest rate
  rateFrequency?: 'monthly' | 'quarterly' | 'annual'; // how the rate is applied
  interestTiers?: InterestTier[];    // bonus tier rules (e.g. > ₹10 000 → 1%)
  createdAt: string;
}

export interface Loan {
  id: string;
  userId: string;
  familyId?: string;
  name: string;
  type: 'Personal' | 'Mortgage' | 'Student' | 'Auto' | 'Other';
  principal: number;
  interestRate: number; // annual percentage rate
  termMonths: number;
  monthlyPayment: number;
  remainingBalance: number;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: 'active' | 'paid' | 'defaulted';
  createdAt: string;
}

export interface TaxRecord {
  id: string;
  userId: string;
  familyId?: string;
  description: string;
  amount: number; // positive for tax‑deductible expense, negative for credit
  date: string; // YYYY‑MM‑DD
  category?: string;
  createdAt: string;
}

export interface RetirementAccount {
  id: string;
  userId: string;
  familyId?: string;
  name: string;
  provider: string; // e.g., "PF", "NPS", "401k"
  contributions: number; // total contributed
  currentValue: number;
  targetValue?: number;
  startDate: string; // YYYY‑MM‑DD
  targetDate?: string; // YYYY‑MM‑DD
  createdAt: string;
}

export interface CurrencyRate {
  currency: string; // ISO code e.g., "USD"
  rateToBase: number; // conversion rate to base currency (e.g., INR)
  updatedAt: string;
}

export interface Alert {
  id: string;
  userId: string;
  type: 'loan_due' | 'fd_maturity' | 'budget_over' | 'tax_deadline';
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PropertyAsset {
  id: string;
  userId: string;
  familyId?: string;
  name: string;
  type: 'Vehicle' | 'Land' | 'Real Estate' | 'Valuable' | 'Other';
  purchasePrice: number;
  purchaseDate: string; // YYYY-MM-DD
  currentValue: number; // Initially set by user or same as purchase price
  aiEstimatedValue?: number; // Latest value predicted by AI
  aiValuationDate?: string; // Timestamp of the last AI valuation
  aiValuationReasoning?: string; // AI's explanation for the valuation
  description?: string;
  location?: string;
  createdAt: string;
}

