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
    if (getApps().some(app => app.name === 'server-app')) {
        return getApp('server-app');
    }
    // When on the server, we can't rely on the automatic SDK configuration
    // that App Hosting provides on the client. We must use the config object.
    return initializeApp(firebaseConfig, 'server-app');
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

export async function saveBillAction(
  data: BillFormValues,
  userId: string
): Promise<{ billId: string } | { error: string }> {
  const validation = billFormSchema.safeParse(data);
  if (!validation.success) {
    console.error(validation.error.flatten().fieldErrors);
    return { error: 'Invalid form data.' };
  }
  
  const serverApp = initializeServerFirebase();
  const firestore = getFirestore(serverApp);

  const billData = validation.data;
  
  const subtotal = billData.items.reduce(
      (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  const discountAmount = subtotal * ((Number(billData.discount) || 0) / 100);
  const totalAmount = subtotal - discountAmount;

  try {
    const userBillsCollection = collection(
      firestore,
      `users/${userId}/bills`
    );
    const newBillRef = doc(userBillsCollection);

    // Create a plain object from the form data to send to Firestore
    const billPayload: any = {
      id: newBillRef.id,
      sellerName: billData.sellerName,
      sellerAddress: billData.sellerAddress,
      clientName: billData.clientName,
      clientAddress: billData.clientAddress,
      billNumber: billData.billNumber,
      date: billData.date, // Firestore can handle Date objects
      totalAmount,
      discount: billData.discount || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Add optional fields only if they have a value
    if (billData.sellerShopNumber) billPayload.sellerShopNumber = billData.sellerShopNumber;
    if (billData.sellerOwnerNumber) billPayload.sellerOwnerNumber = billData.sellerOwnerNumber;


    await setDoc(newBillRef, billPayload);

    // Save items as a subcollection
    const itemsCollection = collection(newBillRef, 'items');
    for (const item of billData.items) {
      const itemData = {
        itemName: item.itemName,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        cost: Number(item.cost) || 0,
      };
      await addDoc(itemsCollection, itemData);
    }

    return { billId: newBillRef.id };
  } catch (e: any) {
    console.error('Failed to save bill:', e);
    return { error: `Failed to save bill. Please try again. ${e.message}` };
  }
}
