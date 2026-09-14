import { MarketplaceProject, TransactionRecord, PurchaseOrder } from "@/types";
import { marketplaceProjects } from "@/lib/mock/marketplace";
import { mockTransactions } from "@/lib/mock/transactions";

// In-memory persistent server ledger and inventory pool
class ServerDatabaseStore {
  private projects: MarketplaceProject[] = JSON.parse(JSON.stringify(marketplaceProjects));
  private transactions: TransactionRecord[] = JSON.parse(JSON.stringify(mockTransactions));

  getProjects(): MarketplaceProject[] {
    return this.projects;
  }

  getProjectById(id: string): MarketplaceProject | undefined {
    return this.projects.find((p) => p.id === id);
  }

  getTransactions(): TransactionRecord[] {
    return this.transactions;
  }

  purchaseCredits(projectId: string, quantityTCO2e: number): {
    order: PurchaseOrder;
    transaction: TransactionRecord;
    updatedProject: MarketplaceProject;
  } {
    const project = this.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }

    if (quantityTCO2e <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }

    if (quantityTCO2e > project.availableTCO2e) {
      throw new Error(
        `Requested allocation of ${quantityTCO2e.toLocaleString()} tCO₂e exceeds currently available inventory of ${project.availableTCO2e.toLocaleString()} tCO₂e.`
      );
    }

    // Decrement inventory on backend
    project.availableTCO2e -= quantityTCO2e;

    const pricePerTonne = project.pricePerTonne;
    const subtotal = Number((quantityTCO2e * pricePerTonne).toFixed(2));
    const serviceFee = Number((subtotal * 0.02).toFixed(2));
    const total = Number((subtotal + serviceFee).toFixed(2));
    const certNum = Math.floor(1000 + Math.random() * 9000);
    const certificateId = `ECO-CERT-2026-09-${certNum}`;
    const txnNum = Math.floor(100000 + Math.random() * 900000);
    const transactionId = `TXN-${txnNum}`;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const order: PurchaseOrder = {
      id: `order-${Date.now()}`,
      projectId: project.id,
      projectName: project.name,
      quantityTCO2e,
      pricePerTonne,
      subtotal,
      serviceFee,
      total,
      certificateId,
      date: dateFormatted,
      status: "Completed",
    };

    const newTxn: TransactionRecord = {
      id: `txn-${Date.now()}`,
      date: dateFormatted,
      transactionId,
      project: project.name,
      projectType: project.type,
      projectImage: project.imageUrl,
      creditsTCO2e: quantityTCO2e,
      pricePerTonne,
      totalAmount: total,
      status: "Completed",
      certificateId,
      verificationStandard: `${project.standard} Verified`,
    };

    // Prepend to audit ledger
    this.transactions = [newTxn, ...this.transactions];

    return {
      order,
      transaction: newTxn,
      updatedProject: project,
    };
  }
}

// Global singleton to preserve across Next.js dev hot-reloads
const globalForServerStore = globalThis as unknown as {
  ecotrackServerStore: ServerDatabaseStore | undefined;
};

export const serverDatabaseStore =
  globalForServerStore.ecotrackServerStore ?? new ServerDatabaseStore();

if (process.env.NODE_ENV !== "production") {
  globalForServerStore.ecotrackServerStore = serverDatabaseStore;
}
