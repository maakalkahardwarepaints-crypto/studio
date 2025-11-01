'use client';

import { useMemo } from 'react';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Loader2, AlertCircle } from 'lucide-react';
import { BillPreview } from '@/components/bill-preview';
import type { BillFormValues } from '@/lib/schemas';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { JMKTradingLogo } from '@/components/icons';

interface BillPageProps {
  params: {
    billId: string;
  };
}

export default function BillPage({ params }: BillPageProps) {
  const { billId } = params;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const billDocRef = useMemoFirebase(() => {
    if (!user || !billId) return null;
    return doc(firestore, `users/${user.uid}/bills/${billId}`);
  }, [firestore, user, billId]);
  
  const itemsCollectionRef = useMemoFirebase(() => {
    if (!billDocRef) return null;
    return collection(billDocRef, 'items');
  }, [billDocRef]);

  const { data: billData, isLoading: isLoadingBill, error: billError } = useDoc(billDocRef);
  const { data: itemsData, isLoading: isLoadingItems, error: itemsError } = useCollection(itemsCollectionRef);

  const isLoading = isUserLoading || isLoadingBill || isLoadingItems;
  const error = billError || itemsError;

  const bill: BillFormValues | null = useMemo(() => {
    if (!billData || !itemsData) return null;
    return {
      ...billData,
      date: billData.date ? new Date(billData.date.seconds * 1000) : new Date(),
      items: itemsData,
    } as BillFormValues;
  }, [billData, itemsData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Error</h1>
        <p className="text-muted-foreground mb-4">
          Could not load the bill. It might have been deleted or you may not have permission to view it.
        </p>
         <p className="text-xs text-muted-foreground">{error.message}</p>
      </div>
    );
  }
  
  if (!bill) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Bill Not Found</h1>
        <p className="text-muted-foreground mb-4">The requested bill could not be found.</p>
        <Button asChild>
          <Link href="/bill/history">Back to History</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-8">
       <header className="max-w-4xl mx-auto mb-4">
        <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
                <JMKTradingLogo className="h-8 w-8" />
                <span className="font-bold text-foreground">JMK Trading</span>
            </Link>
           <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/bill/history">View History</Link>
            </Button>
            <Button asChild>
              <Link href="/create-bill">Create New Bill</Link>
            </Button>
          </div>
        </div>
      </header>
      <BillPreview bill={bill} />
    </div>
  );
}
