"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWalletStore } from "@/store/walletStore";
import { useFixedDepositStore } from "@/store/fixedDepositStore";
import { useTransactionStore } from "@/store/transactionStore";
import { useSavingsGoalStore } from "@/store/savingsGoalStore";
import { useCurrency } from "@/context/CurrencyContext";
import { aiService } from "@/services/aiService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SavingsAccount } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Send, Bot, User, BrainCircuit, Landmark, BarChart3,
  Loader2,
} from "lucide-react";

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { text: "Analyze my recent spending category totals", icon: BarChart3, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  { text: "Am I on-track to meet my savings goals?", icon: TargetIcon, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
  { text: "Recommend Fixed Deposit yield optimization strategy", icon: Landmark, color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  { text: "Calculate my Financial Health Score rating", icon: BrainCircuit, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" },
];

function TargetIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export default function AICoachPage() {
  const { user } = useAuth();
  const { wallets, fetchWallets } = useWalletStore();
  const { deposits, fetchDeposits } = useFixedDepositStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { goals, fetchGoals } = useSavingsGoalStore();
  const { formatPrice } = useCurrency();

  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Hello! I am your **AI Financial Coach**. 🤖\n\nI have complete access to your checking wallets, savings accounts, FDs, and goal lists. I can answer complex financial planning questions, calculate your metrics, or recommend yield optimization strategies based on your actual data!\n\n**Try asking me standard queries or tap a quick-prompt chip below!**",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync data in parallel
  useEffect(() => {
    if (user?.uid) {
      setDbLoading(true);
      Promise.all([
        fetchWallets(user.uid),
        fetchDeposits(user.uid),
        fetchTransactions(user.uid),
        fetchGoals(user.uid),
        getDocs(query(collection(db, "savingsAccounts"), where("userId", "==", user.uid)))
          .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavingsAccount)))
          .then((accts) => setSavingsAccounts(accts))
          .catch(() => [])
      ]).finally(() => setDbLoading(false));
    }
  }, [user?.uid, fetchWallets, fetchDeposits, fetchTransactions, fetchGoals]);

  // Scroll to bottom whenever messages list grows
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const chatHistory = messages.map(m => ({ sender: m.sender, text: m.text }));
      
      const response = await aiService.askFinancialCoach(
        textToSend,
        chatHistory,
        {
          wallets,
          savingsAccounts,
          fixedDeposits: deposits,
          transactions,
          goals
        }
      );

      const aiMsg: Message = {
        sender: 'ai',
        text: response,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const errorMsg: Message = {
        sender: 'ai',
        text: "Apologies, I encountered an issue querying my generative models. Please verify your connection or try again shortly.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPromptClick = (text: string) => {
    handleSend(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            AI Financial Coach
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">Fiduciary AI</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">
            Discuss goal achievement, budgets, savings optimization, and yield laddering with secure RAG.
          </p>
        </div>
      </div>

      {/* Main Panel */}
      <Card className="flex flex-col flex-1 min-h-0 relative overflow-hidden border border-indigo-150 dark:border-indigo-900/50 shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100/20 dark:bg-indigo-900/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-150/20 dark:bg-purple-900/5 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10 min-h-0 scrollbar-thin">
          {dbLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <p className="text-sm font-medium text-gray-500 animate-pulse">Syncing wallets, savings rates, and ledger details...</p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div className={`p-2 rounded-lg self-start ${m.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'}`}>
                  {m.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                </div>
                
                <div className={`p-4 rounded-2xl flex flex-col space-y-1 shadow-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-800 dark:text-zinc-150 rounded-tl-none'
                }`}>
                  <div className="text-sm whitespace-pre-wrap font-medium">
                    {/* Render simple markdown blocks */}
                    {m.text.split('\n').map((line, lIdx) => {
                      let content: React.ReactNode = line;
                      // Match bold
                      if (line.includes('**')) {
                        const parts = line.split('**');
                        content = parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-extrabold">{p}</strong> : p);
                      }
                      // Bullet lists
                      if (line.trim().startsWith('-')) {
                        return <li key={lIdx} className="ml-4 list-disc">{line.replace('-', '').trim()}</li>;
                      }
                      return <p key={lIdx} className="min-h-[6px]">{content}</p>;
                    })}
                  </div>
                  <span className={`text-[10px] self-end mt-1 opacity-60 ${m.sender === 'user' ? 'text-white' : 'text-gray-400'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 self-start">
                <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-bounce" />
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                <span className="text-xs font-semibold text-gray-500 animate-pulse">Financial Coach is thinking...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Action Panel Footer */}
        <div className="border-t border-gray-100 dark:border-zinc-850 p-4 bg-gray-50/50 dark:bg-zinc-950/20 space-y-4 relative z-10">
          {/* Quick suggestions */}
          {!loading && messages.length < 4 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Quick-Prompt advisor chips
              </p>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                {QUICK_PROMPTS.map((chip, idx) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuickPromptClick(chip.text)}
                      className="p-3 text-left rounded-xl border border-gray-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-400 dark:hover:border-indigo-700 transition-all text-xs font-medium text-gray-700 dark:text-zinc-200 shadow-sm flex flex-col justify-between gap-3 hover:translate-y-[-2px] duration-200"
                    >
                      <div className={`p-2 rounded-lg self-start ${chip.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span>{chip.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chat Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about budgets, FD compound yields, crypto ROI tracking..."
              className="flex-1 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 py-6"
              disabled={loading || dbLoading}
            />
            <Button
              type="submit"
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
              disabled={!input.trim() || loading || dbLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
