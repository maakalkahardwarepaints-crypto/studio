'use server';

import { generateBillSummary } from '@/ai/flows/generate-bill-summary';
import { billFormSchema, type BillFormValues } from '@/lib/schemas';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  getFirestore,
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// Helper function for server-side Firebase initialization
function initializeServerFirebase() {
    if (!getApps().length) {
        // When on the server, we can't rely on the automatic SDK configuration
        // that App Hosting provides on the client. We must use the config object.
        return initializeApp(firebaseConfig);
    }
    return getApp();
}


export async function getBillSummaryAction(
  data: BillFormValues
): Promise<{ summary: string } | { error: string }> {
  const validation = billFormSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid form data.' };
  }

  const billData = validation.data;

  try {
    // Ensure Firebase is initialized on the server before use.
    initializeServerFirebase();

    const subtotal = billData.items.reduce(
      (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
    const discountAmount = subtotal * ((Number(billData.discount) || 0) / 100);
    const totalAmount = subtotal - discountAmount;

    const summaryInput = {
      sellerName: billData.sellerName,
      clientName: billData.clientName,
      billNumber: billData.billNumber,
      date: billData.date.toLocaleDateString(),
      totalAmount,
      items: billData.items.map((item) => ({
        itemName: item.itemName,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0),
      })),
    };

    const result = await generateBillSummary(summaryInput);
    return { summary: result.summary };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to generate summary. Please try again.' };
  }
}
