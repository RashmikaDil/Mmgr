"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, ArrowRightLeft, Target, FileText, Settings, LogOut, Landmark, Banknote, PiggyBank, TrendingUp, DollarSign, Briefcase, CalendarClock, BellRing, CreditCard } from "lucide-react";
import { authService } from "@/services/authService";
import { useRouter } from "next/navigation";

const navItems = [
  { name: "Dashboard",        href: "/dashboard",        icon: LayoutDashboard },
  { name: "Wallets",          href: "/wallets",          icon: Wallet },
  { name: "Transactions",     href: "/transactions",     icon: ArrowRightLeft },
  { name: "ATM / CDM",        href: "/atm-cdm",          icon: CreditCard },
  { name: "Budgets",          href: "/budgets",          icon: Target },
];

const advancedItems = [
  { name: "Savings & Goals",  href: "/savings",          icon: PiggyBank },
  { name: "Fixed Deposits",   href: "/fixed-deposits",   icon: Landmark },
  { name: "Savings Accounts", href: "/savings-accounts", icon: Banknote },
  { name: "Investments",      href: "/investments",      icon: TrendingUp },
  { name: "Reports",          href: "/reports",          icon: FileText },
  { name: "Net Worth", href: "/net-worth", icon: DollarSign },
  { name: "Tax", href: "/tax", icon: Briefcase },
  { name: "Retirement", href: "/retirement", icon: CalendarClock },
  { name: "Transfer", href: "/transfer", icon: ArrowRightLeft },

];
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await authService.logout();
    router.push("/login");
  };

  return (
    <div className="flex flex-col w-64 bg-white dark:bg-zinc-950 border-r min-h-screen">
      <div className="flex items-center justify-center h-16 border-b">
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          WealthTracker
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-2 py-2 text-sm font-medium rounded-md group
                  ${isActive 
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-900 dark:hover:text-gray-50"
                  }
                `}
              >
                <item.icon
                  className={`
                    mr-3 flex-shrink-0 h-5 w-5
                    ${isActive ? "text-blue-700 dark:text-blue-200" : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500"}
                  `}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}

          {/* Advanced section divider */}
          <div className="pt-3 pb-1 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
              Finance
            </p>
          </div>

          {advancedItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center px-2 py-2 text-sm font-medium rounded-md group
                  ${isActive 
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-900 dark:hover:text-gray-50"
                  }
                `}
              >
                <item.icon
                  className={`
                    mr-3 flex-shrink-0 h-5 w-5
                    ${isActive ? "text-blue-700 dark:text-blue-200" : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500"}
                  `}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4 space-y-2">
        <Link
          href="/settings"
          className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-900 dark:hover:text-gray-50"
        >
          <Settings className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-red-500" />
          Logout
        </button>
      </div>
    </div>
  );
}
