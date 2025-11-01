'use server';

import { generateBillSummary } from '@/ai/flows/generate-bill-summary';
import { billFormSchema, type BillFormValues } from '@/lib/schemas';
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export async function getBillSummaryAction(
  data: BillFormValues
): Promise<{ summary: string } | { error: string }> {
  const validation = billFormSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid form data.' };
  }

  const billData = validation.data;

  try {
    const totalAmount = billData.items.reduce(
      (acc, item) => acc + item.quantity * item.rate,
      0
    );

    const summaryInput = {
      sellerName: billData.sellerName,
      clientName: billData.clientName,
      billNumber: billData.billNumber,
      date: billData.date.toLocaleDateString(),
      totalAmount,
      items: billData.items.map((item) => ({
        ...item,
        amount: item.quantity * item.rate,
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

  const { firestore } = initializeFirebase();

  const billData = validation.data;
  const totalAmount = billData.items.reduce(
    (acc, item) => acc + (item.quantity || 0) * (item.rate || 0),
    0
  );

  try {
    const userBillsCollection = collection(
      firestore,
      `users/${userId}/bills`
    );
    const newBillRef = doc(userBillsCollection);

    const billPayload = {
      id: newBillRef.id,
      ...billData,
      totalAmount,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newBillRef, billPayload);

    // Save items as a subcollection
    const itemsCollection = collection(newBillRef, 'items');
    for (const item of billData.items) {
      await addDoc(itemsCollection, item);
    }

    return { billId: newBillRef.id };
  } catch (e) {
    console.error('Failed to save bill:', e);
    return { error: 'Failed to save bill. Please try again.' };
  }
}
