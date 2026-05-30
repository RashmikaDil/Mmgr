"use client";

import { useAuth } from "@/hooks/useAuth";
import { Bell, Menu, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between h-16 px-4 bg-white dark:bg-zinc-950 border-b">
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="p-2 mr-4 text-gray-500 rounded-md md:hidden hover:bg-gray-100 dark:hover:bg-zinc-800"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Dashboard
        </h2>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="text-gray-500 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </Button>
        
        <div className="flex items-center space-x-3">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {user?.displayName || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.email}
            </p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-gray-100 rounded-full dark:bg-zinc-800">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
