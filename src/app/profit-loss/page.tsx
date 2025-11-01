'use client';

import { useMemo } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup, getDocs, query, where, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { JMKTradingLogo } from '@/components/icons';
import { Header } from '@/components/header';
import { useState, useEffect } from 'react';

type Item = {
  id: string;
  itemName: string;
  quantity: number;
  rate: number;
  cost: number;
};

type Bill = {
  id: string;
  totalAmount: number;
};

export default function ProfitLossPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    if (user && firestore) {
      const fetchProfitData = async () => {
        setIsLoading(true);
        try {
          // Fetch all bills for the user
          const billsCollectionRef = collection(firestore, `users/${user.uid}/bills`);
          const billsSnapshot = await getDocs(billsCollectionRef);
          const bills = billsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill));
          const revenue = bills.reduce((acc, bill) => acc + bill.totalAmount, 0);
          setTotalRevenue(revenue);
          
          // Define the parent path for the collection group query
          const userDoc = doc(firestore, 'users', user.uid);

          // Fetch all items within those bills
          const itemsQuery = query(collectionGroup(firestore, 'items'), where('__name__', '>=', userDoc.path + '/'), where('__name__', '<', userDoc.path + '~'));

          const itemsSnapshot = await getDocs(itemsQuery);

          let totalCostOfGoods = 0;
          itemsSnapshot.forEach(doc => {
            const item = doc.data() as Item;
            totalCostOfGoods += (item.cost || 0) * (item.quantity || 0);
          });
          setTotalCost(totalCostOfGoods);
        } catch (e: any) {
          setError(e.message || "Failed to fetch profit and loss data.");
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProfitData();
    } else if (!isUserLoading) {
        setIsLoading(false);
    }
  }, [user, firestore, isUserLoading]);

  const netProfit = totalRevenue - totalCost;

  if (isUserLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
        <p className="text-muted-foreground mb-4">Please sign in to view your profit and loss.</p>
        <Button asChild>
          <Link href="/create-bill">Go to Bill Creation</Link>
        </Button>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Error</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Profit & Loss Statement</CardTitle>
            <CardDescription>An overview of your business's financial performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Total income from sales</p>
                </CardContent>
              </Card>
              <Card>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost of Goods</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{totalCost.toFixed(2)}</div>
                   <p className="text-xs text-muted-foreground">Total cost of items sold</p>
                </CardContent>
              </Card>
              <Card className={netProfit >= 0 ? "border-green-500" : "border-red-500"}>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ₹{netProfit.toFixed(2)}
                  </div>
                   <p className="text-xs text-muted-foreground">Revenue minus costs</p>
                </CardContent>
              </Card>
            </div>
             {totalRevenue === 0 && totalCost === 0 && !isLoading && (
                 <div className="text-center py-12">
                    <h3 className="text-xl font-semibold">No Financial Data Found</h3>
                    <p className="text-muted-foreground mt-2">Create some bills with costs to see your profit analysis.</p>
                    <Button asChild className="mt-4">
                    <Link href="/create-bill">Create a Bill</Link>
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
