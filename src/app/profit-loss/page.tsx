
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { JMKTradingLogo } from '@/components/icons';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { format, startOfDay, startOfMonth, startOfYear } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/header';

interface Item {
  id: string;
  itemName: string;
  quantity: number;
  rate: number;
  cost: number;
}

interface Bill {
    id: string;
    date: { seconds: number; nanoseconds: number };
    totalAmount: number;
    currency?: string;
}

interface AggregatedItem {
    id: string;
    itemName: string;
    quantity: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    currency: string;
}


export default function ProfitLossPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isMobile = useIsMobile();

  const [aggregatedItems, setAggregatedItems] = useState<AggregatedItem[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [profitMargin, setProfitMargin] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("₹");

  const [dailyData, setDailyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [yearlyData, setYearlyData] = useState<any[]>([]);

  const billsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/bills`);
  }, [user, firestore]);

  const { data: bills, isLoading: isLoadingBills, error: billsError } = useCollection<Bill>(billsQuery);
  
  const chartConfig = {
    profit: {
      label: "Profit",
      color: "#00c853",
    },
    loss: {
      label: "Loss",
      color: "#d50000",
    },
  } satisfies ChartConfig

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
        setIsLoading(false);
        return;
    }
    
    if (isLoadingBills) {
      setIsLoading(true);
      return;
    }

    if (billsError) {
        setError(billsError?.message || 'An error occurred');
        setIsLoading(false);
        return;
    }

    if (bills && firestore) {
        if (bills.length > 0) {
            // NOTE: This assumes all bills use the same currency.
            // A more robust solution would handle multiple currencies.
            setCurrency(bills[0].currency || '₹');
        }

        setIsLoading(true);
        const billItemsPromises = bills.map(bill => 
            getDocs(collection(firestore, `users/${user.uid}/bills/${bill.id}/items`))
                .then(itemSnapshot => {
                    const items = itemSnapshot.docs.map(d => d.data() as Item);
                    return {...bill, items};
                })
        );

        Promise.all(billItemsPromises).then(billsWithItems => {
            const itemMap = new Map<string, AggregatedItem>();
            const dailyProfit: { [key: string]: number } = {};
            const monthlyProfit: { [key: string]: number } = {};
            const yearlyProfit: { [key: string]: number } = {};

            billsWithItems.forEach(bill => {
                let billCost = 0;
                const billCurrency = bill.currency || '₹';
                bill.items.forEach(item => {
                    const revenue = (Number(item.rate) || 0) * (Number(item.quantity) || 0);
                    const cost = (Number(item.cost) || 0) * (Number(item.quantity) || 0);
                    const profit = revenue - cost;
                    billCost += cost;

                    const existing = itemMap.get(item.itemName);
                    if (existing) {
                        existing.quantity += Number(item.quantity) || 0;
                        existing.totalRevenue += revenue;
                        existing.totalCost += cost;
                        existing.totalProfit += profit;
                    } else {
                        itemMap.set(item.itemName, {
                            id: item.id,
                            itemName: item.itemName,
                            quantity: Number(item.quantity) || 0,
                            totalRevenue: revenue,
                            totalCost: cost,
                            totalProfit: profit,
                            currency: billCurrency,
                        });
                    }
                });

                const billDate = new Date(bill.date.seconds * 1000);
                const billRevenue = bill.totalAmount;
                const billProfit = billRevenue - billCost;

                const dayKey = format(startOfDay(billDate), 'yyyy-MM-dd');
                const monthKey = format(startOfMonth(billDate), 'yyyy-MM');
                const yearKey = format(startOfYear(billDate), 'yyyy');

                dailyProfit[dayKey] = (dailyProfit[dayKey] || 0) + billProfit;
                monthlyProfit[monthKey] = (monthlyProfit[monthKey] || 0) + billProfit;
                yearlyProfit[yearKey] = (yearlyProfit[yearKey] || 0) + billProfit;
            });
            
            const aggregated = Array.from(itemMap.values());
            aggregated.sort((a, b) => b.totalRevenue - a.totalRevenue);
            setAggregatedItems(aggregated);
            
            const totalRev = aggregated.reduce((sum, item) => sum + item.totalRevenue, 0);
            const totalC = aggregated.reduce((sum, item) => sum + item.totalCost, 0);
            const totalP = totalRev - totalC;
            const margin = totalRev > 0 ? (totalP / totalRev) * 100 : 0;

            setTotalRevenue(totalRev);
            setTotalCost(totalC);
            setTotalProfit(totalP);
            setProfitMargin(margin);
            
            const formatChartData = (data: { [key: string]: number }, dateFormat: string) => 
              Object.entries(data)
                .map(([date, value]) => ({
                  date,
                  formattedDate: format(new Date(date), dateFormat),
                  profit: value >= 0 ? value : 0,
                  loss: value < 0 ? Math.abs(value) : 0,
                }))
                .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            setDailyData(formatChartData(dailyProfit, 'MMM d'));
            setMonthlyData(formatChartData(monthlyProfit, 'MMM yyyy'));
            setYearlyData(formatChartData(yearlyProfit, 'yyyy'));

            setIsLoading(false);
        }).catch(err => {
            setError(err.message);
            setIsLoading(false);
        });

    } else if (!isLoadingBills) {
        setIsLoading(false);
    }
  }, [user, isUserLoading, bills, isLoadingBills, billsError, firestore]);


  if (isLoading || isUserLoading) {
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

  const ChartCard = ({ title, data }: { title: string; data: any[]}) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
               <AreaChart
                data={data}
                margin={{
                  left: 0,
                  right: 20,
                  top: 5,
                  bottom: 5,
                }}
              >
                <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00c853" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#00c853" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d50000" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#d50000" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                   tickFormatter={(value) => value}
                />
                 <YAxis
                      tickFormatter={(value) => `${currency}${value}`}
                      width={isMobile ? 60 : 80}
                      tick={{ fontSize: 12 }}
                  />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const profit = payload.find(p => p.dataKey === 'profit')?.value as number || 0;
                      const loss = payload.find(p => p.dataKey === 'loss')?.value as number || 0;
                      const net = profit - loss;

                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {label}
                              </span>
                              <span className={`font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {`${currency}${net.toFixed(2)}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                 <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#00c853"
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                  stackId="1"
                />
                 <Area
                  type="monotone"
                  dataKey="loss"
                  stroke="#d50000"
                  fillOpacity={1}
                  fill="url(#colorLoss)"
                  stackId="1"
                />
              </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No data available for this period.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  
  const DesktopItemsTable = () => (
     <div className="overflow-x-auto">
        <Table>
        <TableHeader>
            <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead className="text-right">Total Quantity Sold</TableHead>
            <TableHead className="text-right">Total Revenue</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
            <TableHead className="text-right">Total Profit</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {aggregatedItems.map((item) => (
                <TableRow key={item.id}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">{item.currency}{item.totalRevenue.toFixed(2)}</TableCell>
                <TableCell className="text-right">{item.currency}{item.totalCost.toFixed(2)}</TableCell>
                <TableCell className={`text-right font-semibold ${item.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{item.currency}{item.totalProfit.toFixed(2)}</TableCell>
                </TableRow>
            ))}
        </TableBody>
        </Table>
    </div>
  );

  const MobileItemsList = () => (
    <div className="space-y-4">
        {aggregatedItems.map(item => (
            <Card key={item.id}>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{item.itemName}</CardTitle>
                    <CardDescription>Total Quantity Sold: {item.quantity}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="text-muted-foreground">Total Revenue</div>
                    <div className="text-right font-medium">{item.currency}{item.totalRevenue.toFixed(2)}</div>

                    <div className="text-muted-foreground">Total Cost</div>
                    <div className="text-right font-medium">{item.currency}{item.totalCost.toFixed(2)}</div>
                </CardContent>
                 <CardFooter className="bg-muted/50 p-3 mt-4">
                     <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-base">Total Profit</span>
                        <span className={`font-bold text-base ${item.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.currency}{item.totalProfit.toFixed(2)}
                        </span>
                    </div>
                </CardFooter>
            </Card>
        ))}
    </div>
  );


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Profit &amp; Loss Summary</CardTitle>
                <CardDescription>An overview of your business performance based on all bills.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{currency}{totalRevenue.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground">Total amount from all bills (after discounts)</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Cost of Goods</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{currency}{totalCost.toFixed(2)}</div>
                             <p className="text-xs text-muted-foreground">Total cost of all items sold</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                            {totalProfit >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currency}{totalProfit.toFixed(2)}</div>
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
        
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 mb-8">
            <ChartCard title="Daily Profit/Loss" data={dailyData} />
            <ChartCard title="Monthly Profit/Loss" data={monthlyData} />
            <ChartCard title="Yearly Profit/Loss" data={yearlyData} />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>All Items Sold</CardTitle>
                <CardDescription>A detailed list of all items from your bills, sorted by total sales revenue.</CardDescription>
            </CardHeader>
            <CardContent>
             {aggregatedItems && aggregatedItems.length > 0 ? (
                isMobile ? <MobileItemsList /> : <DesktopItemsTable />
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

    

    



    