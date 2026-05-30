import { db } from "@/lib/firebase";
import { doc, runTransaction } from "firebase/firestore";

type AccountType = "wallet" | "fixedDeposit" | "savingsAccount" | "investment";

function getCollection(type: AccountType): string {
  switch (type) {
    case "wallet":
      return "wallets";
    case "fixedDeposit":
      return "fixedDeposits";
    case "savingsAccount":
      return "savingsAccounts";
    case "investment":
      return "investments";
    default:
      throw new Error("Invalid account type");
  }
}

/**
 * Perform a money transfer between two accounts.
 * Executes an atomic Firestore transaction ensuring balances stay consistent.
 */
export async function transferMoney(
  source: { type: AccountType; id: string },
  destination: { type: AccountType; id: string },
  amount: number
): Promise<void> {
  if (amount <= 0) {
    throw new Error("Transfer amount must be positive");
  }

  await runTransaction(db, async (transaction) => {
    const sourceRef = doc(db, getCollection(source.type), source.id);
    const destRef = doc(db, getCollection(destination.type), destination.id);

    const sourceSnap = await transaction.get(sourceRef);
    const destSnap = await transaction.get(destRef);

    if (!sourceSnap.exists() || !destSnap.exists()) {
      throw new Error("One of the accounts does not exist");
    }

    const sourceBalance = sourceSnap.get("balance") as number;
    const destBalance = destSnap.get("balance") as number;

    if (sourceBalance < amount) {
      throw new Error("Insufficient funds in source account");
    }

    transaction.update(sourceRef, { balance: sourceBalance - amount });
    transaction.update(destRef, { balance: destBalance + amount });
  });
}
