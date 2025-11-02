'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collectionGroup, query, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { JMKTradingLogo } from '@/components/icons';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Item {
  id: string;
  itemName: string;
  quantity: number;
  rate: number;
  cost: number;
}

export default function ProfitLossPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [profitMargin, setProfitMargin] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const itemsQuery = user ? query(collectionGroup(firestore, 'items')) : null;
  const { data: items, isLoading: isLoadingItems, error: itemsError } = useCollection<Item>(itemsQuery);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }
    
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    if (isLoadingItems) {
      setIsLoading(true);
      return;
    }

    if (itemsError) {
      setError(itemsError.message);
      setIsLoading(false);
      return;
    }

    if (items) {
      let revenue = 0;
      let cost = 0;

      items.forEach(item => {
        revenue += (Number(item.rate) || 0) * (Number(item.quantity) || 0);
        cost += (Number(item.cost) || 0) * (Number(item.quantity) || 0);
      });

      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      setTotalRevenue(revenue);
      setTotalCost(cost);
      setTotalProfit(profit);
      setProfitMargin(margin);
      setIsLoading(false);
    } else {
        setIsLoading(false);
    }

  }, [user, isUserLoading, items, isLoadingItems, itemsError]);


  if (isLoading) {
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
        <p className="text-muted-foreground mb-4">Could not load profit/loss data. Please try again later.</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
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
      <main className="container mx-auto p-4 md:p-8">
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Profit &amp; Loss Summary</CardTitle>
                <CardDescription>An overview of your business performance based on all bills.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground">Total amount from all bills (after discounts)</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Cost of Goods</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{totalCost.toFixed(2)}</div>
                             <p className="text-xs text-muted-foreground">Total cost of all items sold</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                            {totalProfit >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{totalProfit.toFixed(2)}</div>
                             <p className="text-xs text-muted-foreground">Revenue minus Cost</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                             {profitMargin >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profitMargin.toFixed(2)}%</div>
                             <p className="text-xs text-muted-foreground">Percentage of revenue that is profit</p>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>All Items Sold</CardTitle>
                <CardDescription>A detailed list of all items from your bills.</CardDescription>
            </CardHeader>
            <CardContent>
             {items && items.length > 0 ? (
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Total Quantity</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="text-right">Total Profit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => {
                            const revenue = (Number(item.rate) || 0) * (Number(item.quantity) || 0);
                            const cost = (Number(item.cost) || 0) * (Number(item.quantity) || 0);
                            const profit = revenue - cost;
                            return (
                                <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.itemName}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">₹{revenue.toFixed(2)}</TableCell>
                                <TableCell className="text-right">₹{cost.toFixed(2)}</TableCell>
                                <TableCell className={`text-right font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{profit.toFixed(2)}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    </Table>
                </div>
                 ) : (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold">No Items Found</h3>
                  <p className="text-muted-foreground mt-2">You haven't sold any items yet.</p>
                </div>
              )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
