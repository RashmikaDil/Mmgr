"use client";

import { useEffect, useState } from "react";
import { Plus, Wallet as WalletIcon, MoreVertical, Edit, Trash } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWalletStore } from "@/store/walletStore";
import { Wallet } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WalletModal } from "@/components/forms/WalletModal";

export default function WalletsPage() {
  const { user } = useAuth();
  const { wallets, loading, fetchWallets, removeWallet } = useWalletStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletToEdit, setWalletToEdit] = useState<Wallet | null>(null);

  useEffect(() => {
    if (user) {
      fetchWallets(user.uid);
    }
  }, [user, fetchWallets]);

  const handleEdit = (wallet: Wallet) => {
    setWalletToEdit(wallet);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setWalletToEdit(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this wallet? This action cannot be undone.")) {
      await removeWallet(id);
    }
  };

  if (loading && wallets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Wallets
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your accounts and track their balances.
          </p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Wallet
        </Button>
      </div>

      {wallets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 mb-4 bg-gray-100 rounded-full dark:bg-zinc-800 flex items-center justify-center">
              <WalletIcon className="w-6 h-6 text-gray-500" />
            </div>
            <CardTitle className="mb-2">No wallets found</CardTitle>
            <CardDescription className="mb-6">
              You haven't added any wallets yet. Add your first wallet to start tracking.
            </CardDescription>
            <Button onClick={handleAddNew}>Add Your First Wallet</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {wallets.map((wallet) => (
            <Card key={wallet.id} className="relative overflow-hidden group">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{wallet.name}</CardTitle>
                  <CardDescription>{wallet.type}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(wallet)}
                    className="p-1.5 text-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(wallet.id)}
                    className="p-1.5 text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mt-2">
                  {wallet.balance.toLocaleString('en-US', { style: 'currency', currency: wallet.currency })}
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WalletModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        walletToEdit={walletToEdit} 
      />
    </div>
  );
}
