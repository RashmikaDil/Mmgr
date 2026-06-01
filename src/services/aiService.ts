import { SavingsAccount, FixedDeposit, SavingsGoal, Transaction } from "@/types";

export interface AIInsight {
  type: 'yield' | 'emergency' | 'fd' | 'budget' | 'leak';
  title: string;
  description: string;
  impact: string;
  color: 'indigo' | 'emerald' | 'amber' | 'purple' | 'red';
}

export interface FinancialHealthScore {
  score: number;
  factors: {
    savingsRate: number;
    emergencyFund: number;
    debtRatio: number;
    expenseRatio: number;
    consistency: number;
  };
  recommendations: string[];
}

export interface GoalPrediction {
  probability: number; // 0-100
  monthsToTarget: number;
  monthsRequired: number;
  shortfall: number;
  recommendedMonthlyRate: number;
  completionDate: string;
  status: 'on-track' | 'lagging' | 'critical';
}

// Category Mapping
export const CATEGORY_MAP: Record<string, string> = {
  'cat-exp-1': 'Food',
  'cat-exp-2': 'Transport',
  'cat-exp-3': 'Utilities',
  'cat-exp-4': 'Shopping',
  'cat-exp-5': 'Education',
  'cat-exp-6': 'Medical',
  'cat-exp-7': 'Entertainment',
  'cat-exp-8': 'Fuel',
  'cat-exp-9': 'Other'
};

// Simple auto-categorization map based on keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'cat-exp-1': ['kfc', 'mcdonald', 'pizza', 'hut', 'burger', 'food', 'restaurant', 'din', 'grocery', 'uber eats', 'keells', 'cargills'],
  'cat-exp-2': ['uber', 'pickme', 'taxi', 'train', 'bus', 'flight', 'airline', 'tuk'],
  'cat-exp-3': ['ceb', 'leco', 'water', 'electricity', 'dialog', 'mobitel', 'slt', 'telecom', 'internet', 'fiber', 'bill', 'recharge'],
  'cat-exp-4': ['daraz', 'amazon', 'ebay', 'cloth', 'shirt', 'dress', 'shoes', 'mall', 'supermarket', 'bag', 'buy'],
  'cat-exp-5': ['school', 'tuition', 'class', 'course', 'udemy', 'coursera', 'book', 'exam', 'fees', 'college', 'university'],
  'cat-exp-6': ['hospital', 'doctor', 'medicine', 'pharmacy', 'clinic', 'dental', 'health', 'surgical', 'asiri', 'lanka hospitals'],
  'cat-exp-7': ['netflix', 'spotify', 'movie', 'cinema', 'youtube', 'premium', 'game', 'play', 'bar', 'club', 'pub', 'fun'],
  'cat-exp-8': ['fuel', 'petrol', 'diesel', 'shed', 'cpc', 'ioc', 'octane', 'filling station'],
};

export const aiService = {
  /** Get API key from config or storage */
  getApiKey(): string | null {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("GEMINI_API_KEY");
      if (savedKey) return savedKey;
    }
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || null;
  },

  /** Auto-categorize an expense description using offline keyword matching */
  categorizeExpense(description: string): { categoryId: string; confidence: number } {
    const desc = description.toLowerCase().trim();
    if (!desc) return { categoryId: 'cat-exp-9', confidence: 0.1 };

    let matchedCategoryId = 'cat-exp-9';
    let highestConfidence = 0.3;

    for (const [catId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (desc.includes(keyword)) {
          // Exact match gives higher confidence
          const matchConfidence = desc === keyword ? 0.95 : 0.85;
          if (matchConfidence > highestConfidence) {
            highestConfidence = matchConfidence;
            matchedCategoryId = catId;
          }
        }
      }
    }

    return { categoryId: matchedCategoryId, confidence: highestConfidence };
  },

  /** Analyze transactions for spending anomalies */
  detectAnomalies(transactions: Transaction[]): string[] {
    const expenses = transactions.filter((t) => t.type === "expense");
    if (expenses.length < 5) return [];

    const anomalies: string[] = [];
    const categoryTotals: Record<string, number[]> = {};

    expenses.forEach((t) => {
      if (!categoryTotals[t.categoryId]) categoryTotals[t.categoryId] = [];
      categoryTotals[t.categoryId].push(t.amount);
    });

    // Detect if the latest transaction in each category is > 2.5x the average
    for (const [catId, amounts] of Object.entries(categoryTotals)) {
      if (amounts.length < 3) continue;
      const latest = amounts[amounts.length - 1];
      const history = amounts.slice(0, -1);
      const avg = history.reduce((sum, val) => sum + val, 0) / history.length;
      
      if (latest > avg * 2.5 && latest > 1000) {
        const catName = CATEGORY_MAP[catId] || "Other";
        anomalies.push(
          `Your recent ${catName} spending of ${latest.toFixed(0)} is unusually high (over 2.5x your average of ${avg.toFixed(0)}).`
        );
      }
    }

    return anomalies;
  },

  /** Calculate standard predictive Financial Health Score (0-100) */
  analyzeFinancialHealth(
    wallets: { balance: number }[],
    savingsAccounts: SavingsAccount[],
    fixedDeposits: FixedDeposit[],
    transactions: Transaction[]
  ): FinancialHealthScore {
    const checkingBalance = wallets.reduce((s, w) => s + w.balance, 0);
    const savingsBalance = savingsAccounts.reduce((s, a) => s + a.balance, 0);
    const fdBalance = fixedDeposits.reduce((s, fd) => s + fd.principal, 0);
    const totalLiquid = checkingBalance + savingsBalance + fdBalance;

    // Monthly Cash Flow
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const currentMonthTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });

    let monthlyIncome = currentMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    let monthlyExpense = currentMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Fallback to all-time averages if current month has no records
    if (monthlyIncome === 0) {
      monthlyIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0) / 3 || 3000;
    }
    if (monthlyExpense === 0) {
      monthlyExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0) / 3 || 2000;
    }

    // 1. Savings Rate factor (Max 20 points)
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;
    const savingsRateScore = Math.max(0, Math.min(20, (savingsRate / 40) * 20)); // Maxed at 40% savings rate

    // 2. Emergency Fund cover factor (Max 25 points)
    const avgMonthlyExpense = monthlyExpense || 1000;
    const monthsCovered = totalLiquid / avgMonthlyExpense;
    const emergencyScore = Math.max(0, Math.min(25, (monthsCovered / 6) * 25)); // Maxed at 6 months coverage

    // 3. Debt Ratio factor (Max 15 points) - Assuming no loans means perfect debt score
    const debtRatioScore = 15; // In fully integrated app, would check outstanding loans

    // 4. Expense Ratio factor (Max 20 points) - Lower ratio = higher score
    const expenseRatio = monthlyIncome > 0 ? (monthlyExpense / monthlyIncome) * 100 : 100;
    const expenseScore = Math.max(0, Math.min(20, (1 - Math.max(0, expenseRatio - 30) / 70) * 20));

    // 5. Income Consistency & frequency (Max 20 points)
    const consistencyScore = Math.min(20, transactions.filter(t => t.type === 'income').length * 4);

    const totalScore = Math.round(
      savingsRateScore + emergencyScore + debtRatioScore + expenseScore + consistencyScore
    );

    const recommendations: string[] = [];
    if (savingsRate < 10) recommendations.push("Increase savings rate: Aim to save at least 15-20% of your net monthly income.");
    if (monthsCovered < 3) recommendations.push(`Build cash cushion: Your liquid reserves cover only ${monthsCovered.toFixed(1)} months of average expenses. Aim for 3-6 months.`);
    if (checkingBalance > totalLiquid * 0.4) recommendations.push("Optimize yield: You have a high ratio of idle cash in your checking wallets. Consider moving some to a High-Yield Savings or FDs.");
    if (expenseRatio > 70) recommendations.push("Review fixed overheads: Your expenses consume over 70% of your income. Audit discretionary subscription leaks.");

    if (recommendations.length === 0) {
      recommendations.push("Excellent work! You are meeting all standard FinTech health indicators. Maintain your current allocation.");
    }

    return {
      score: Math.min(100, Math.max(0, totalScore)),
      factors: {
        savingsRate: Math.round(Math.min(100, Math.max(0, savingsRate))),
        emergencyFund: Math.round(monthsCovered * 10) / 10,
        debtRatio: 0, // Placeholder
        expenseRatio: Math.round(expenseRatio),
        consistency: Math.round((consistencyScore / 20) * 100),
      },
      recommendations,
    };
  },

  /** Predict savings goal progress & completion probability */
  predictGoal(goal: SavingsGoal, monthlySavingsRate: number): GoalPrediction {
    const shortfall = goal.targetAmount - goal.currentAmount;
    if (shortfall <= 0) {
      return {
        probability: 100,
        monthsToTarget: 0,
        monthsRequired: 0,
        shortfall: 0,
        recommendedMonthlyRate: 0,
        completionDate: new Date().toISOString().slice(0, 10),
        status: 'on-track'
      };
    }

    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const monthsToTarget = Math.max(0.5, (targetDate.getTime() - today.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    
    const rate = Math.max(10, monthlySavingsRate);
    const monthsRequired = shortfall / rate;
    const recommendedMonthlyRate = shortfall / monthsToTarget;

    let probability = Math.round((monthsToTarget / monthsRequired) * 100);
    probability = Math.max(0, Math.min(99, probability)); // Max 99% if not yet complete

    let status: 'on-track' | 'lagging' | 'critical' = 'on-track';
    if (probability < 40) status = 'critical';
    else if (probability < 75) status = 'lagging';

    const completionDate = new Date(today.getTime() + monthsRequired * 30.44 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    return {
      probability,
      monthsToTarget: Math.round(monthsToTarget * 10) / 10,
      monthsRequired: Math.round(monthsRequired * 10) / 10,
      shortfall,
      recommendedMonthlyRate: Math.round(recommendedMonthlyRate),
      completionDate,
      status
    };
  },

  /** Generates real-time custom insights for the dashboard */
  generateSpendingInsights(transactions: Transaction[], currencyFormat: (v: number) => string): AIInsight[] {
    const insights: AIInsight[] = [];
    const expenses = transactions.filter((t) => t.type === "expense");
    
    if (expenses.length < 3) return [];

    const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((t) => {
      categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
    });

    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    
    // Insight 1: Highest Expense category
    if (sortedCats[0]) {
      const [catId, amount] = sortedCats[0];
      const catName = CATEGORY_MAP[catId] || "Other";
      const percentage = (amount / totalSpent) * 100;
      if (percentage > 25) {
        insights.push({
          type: "leak",
          title: `High ${catName} Spending`,
          description: `Your spending on ${catName} is ${currencyFormat(amount)}, consuming ${percentage.toFixed(0)}% of your total monthly expense. Try setting a budget limit here.`,
          impact: `${percentage.toFixed(0)}% of budget`,
          color: "red"
        });
      }
    }

    // Insight 2: Subscriptions check (Entertainment)
    const entAmount = categoryTotals['cat-exp-7'] || 0;
    if (entAmount > 1500) {
      insights.push({
        type: "leak",
        title: "Discretionary Subscriptions Audit",
        description: `You spent ${currencyFormat(entAmount)} on entertainment and digital subscriptions. Pruning just one unused service could save you significant cash this year.`,
        impact: "Leak Warning",
        color: "amber"
      });
    }

    // Insight 3: Basic generic savings suggestion
    insights.push({
      type: "budget",
      title: "Surplus Savings Potential",
      description: "Reducing dining out and shopping expenses by 15% would liberate extra cash that can be immediately routed to High-Interest Fixed Deposits.",
      impact: "+15% Yield Boost",
      color: "emerald"
    });

    return insights;
  },

  /** Query Google's Gemini API serverless handler or run rule engine locally */
  async askFinancialCoach(
    queryText: string,
    history: { sender: 'user' | 'ai'; text: string }[],
    financialState: {
      wallets: any[];
      savingsAccounts: any[];
      fixedDeposits: any[];
      transactions: any[];
      goals: any[];
    }
  ): Promise<string> {
    const key = this.getApiKey();
    if (!key) {
      return this.resolveLocalQueryHeuristic(queryText, financialState);
    }

    const stateSummary = `
      Current User Balances/State:
      - Checking Accounts/Wallets: ${JSON.stringify(financialState.wallets.map(w => ({ name: w.name, balance: w.balance })))}
      - Savings Accounts: ${JSON.stringify(financialState.savingsAccounts.map(s => ({ name: s.name, balance: s.balance, rate: s.interestRate })))}
      - Fixed Deposits: ${JSON.stringify(financialState.fixedDeposits.map(fd => ({ principal: fd.principal, rate: fd.interestRate, status: fd.status })))}
      - Financial Goals: ${JSON.stringify(financialState.goals.map(g => ({ name: g.name, target: g.targetAmount, current: g.currentAmount })))}
      - Recent Expenses: ${JSON.stringify(financialState.transactions.filter(t => t.type === 'expense').slice(0, 10).map(t => ({ title: t.title, amount: t.amount, categoryId: t.categoryId })))}
    `;

    const chatHistory = history.map(h => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n');

    const prompt = `
      You are an expert fiduciary personal finance coach and certified financial advisor. 
      You are advising a user on their wealth tracking, savings, and investments.
      Be concise, motivating, and mathematically accurate.
      
      User's Financial Dataset:
      ${stateSummary}

      Conversation History:
      ${chatHistory}

      User's Query: "${queryText}"

      Answer directly, in clean Markdown. Support Sri Lankan rupees (Rs. / LKR) or other currencies as relevant. Formulate a highly personalized response.
    `;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || "I was unable to formulate a response. Please try again.";
    } catch (e) {
      console.warn("Gemini API call failed, falling back to local query processor:", e);
      return this.resolveLocalQueryHeuristic(queryText, financialState);
    }
  },

  /** Fallback rule engine to handle natural language finance queries offline */
  resolveLocalQueryHeuristic(queryText: string, state: any): string {
    const q = queryText.toLowerCase();
    
    const wallets = state.wallets || [];
    const savingsAccounts = state.savingsAccounts || [];
    const fixedDeposits = state.fixedDeposits || [];
    const transactions = state.transactions || [];
    const goals = state.goals || [];

    const checkingBalance = wallets.reduce((s: number, w: any) => s + w.balance, 0);
    const savingsBalance = savingsAccounts.reduce((s: number, a: any) => s + a.balance, 0);
    const fdBalance = fixedDeposits.reduce((s: number, fd: any) => s + fd.principal, 0);
    const totalLiquid = checkingBalance + savingsBalance + fdBalance;

    const expenses = transactions.filter((t: any) => t.type === "expense");
    const totalExpenses = expenses.reduce((s: number, t: any) => s + t.amount, 0);
    
    if (q.includes("spent") || q.includes("expense") || q.includes("food") || q.includes("shopping")) {
      // Analyze category spending
      let response = `Based on your recent transaction ledger, you have total expenses of **LKR ${totalExpenses.toLocaleString()}**.\n\nHere is your expense category breakdown:\n`;
      
      const categoryTotals: Record<string, number> = {};
      expenses.forEach((t: any) => {
        categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
      });

      Object.entries(categoryTotals).forEach(([catId, amount]) => {
        const catName = CATEGORY_MAP[catId] || "Other";
        response += `- **${catName}**: LKR ${amount.toLocaleString()}\n`;
      });

      response += `\n*Advice*: Consider setting spending limits inside the **Budgets** section to curb high-spending categories.`;
      return response;
    }

    if (q.includes("fd") || q.includes("fixed deposit") || q.includes("interest")) {
      const activeFDs = fixedDeposits.filter((fd: any) => fd.status === 'active');
      const totalFDPrincipal = activeFDs.reduce((s: number, fd: any) => s + fd.principal, 0);
      
      let response = `You currently have **${activeFDs.length} active Fixed Deposits** totaling **LKR ${totalFDPrincipal.toLocaleString()}** in principal investments.\n\n`;
      if (activeFDs.length > 0) {
        response += "Your FDs are locking in guaranteed yields. Consider implementing a **reinvestment laddering strategy** (e.g. splitting deposits into 6-month and 12-month durations) to ensure you maintain liquidity while capturing maximum interest yield.";
      } else {
        response += "You currently have no active Fixed Deposits. Lock in high yields! Standard Fixed Deposits are currently outperforming standard savings rates. Route a portion of checking cash here.";
      }
      return response;
    }

    if (q.includes("save") || q.includes("goal") || q.includes("budget")) {
      if (goals.length === 0) {
        return "You haven't defined any **Savings Goals** yet! Setting goals like an 'Emergency Fund' or 'Vacation' increases savings success rates by over 40%. Jump over to the **Goals** dashboard to get started.";
      }
      
      let response = "Here is a progress projection for your active Savings Goals:\n\n";
      goals.forEach((g: any) => {
        const percent = Math.round((g.currentAmount / g.targetAmount) * 100);
        response += `- **${g.name}**: ${percent}% complete (${g.currentAmount.toLocaleString()} / ${g.targetAmount.toLocaleString()} LKR)\n`;
      });
      response += "\n*AI Recommendation*: Maintain a steady savings rate of at least 15% of monthly income to reach these goals ahead of schedule.";
      return response;
    }

    return `Hello! I am your AI Financial Coach. 🤖\n\nI can analyze your bank accounts, savings portfolios, FDs, and expense transactions to advise you. You have total liquid assets of **LKR ${totalLiquid.toLocaleString()}** (Checking: ${checkingBalance.toLocaleString()}, Savings: ${savingsBalance.toLocaleString()}, FDs: ${fdBalance.toLocaleString()}).\n\n**Ask me queries like:**\n- *"How much did I spend?"*\n- *"Analyze my fixed deposits"* \n- *"Review my savings goals"*`;
  }
};
