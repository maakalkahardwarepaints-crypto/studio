'use client';

import { useMemo, useState } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { JMKTradingLogo } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';


export default function BillHistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [billToDelete, setBillToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const billsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/bills`);
  }, [firestore, user]);

  const { data: bills, isLoading: isLoadingBills, error: billsError } = useCollection(billsCollection);

  const sortedBills = useMemo(() => {
    if (!bills) return [];
    return [...bills].sort((a, b) => {
      const dateA = a.createdAt?.toDate() || 0;
      const dateB = b.createdAt?.toDate() || 0;
      return dateB - dateA;
    });
  }, [bills]);

  const handleDeleteBill = () => {
    if (!user || !firestore || !billToDelete) {
        toast({ title: 'Error', description: 'Could not delete bill. User or bill ID is missing.', variant: 'destructive' });
        return;
    }
    setIsDeleting(true);

    const billRef = doc(firestore, `users/${user.uid}/bills/${billToDelete}`);
    const itemsRef = collection(billRef, 'items');

    getDocs(itemsRef)
      .then(itemsSnapshot => {
        const deletePromises = itemsSnapshot.docs.map(itemDoc => 
          deleteDoc(itemDoc.ref).catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: itemDoc.ref.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError; 
          })
        );
        return Promise.all(deletePromises);
      })
      .then(() => {
        return deleteDoc(billRef).catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: billRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });
      })
      .then(() => {
        toast({ title: 'Success', description: 'Bill deleted successfully.' });
      })
      .catch(error => {
        // Errors are already emitted, so we just need to handle UI state.
        if (!(error instanceof FirestorePermissionError)) {
           toast({ title: 'Error', description: 'An unexpected error occurred while deleting the bill.', variant: 'destructive' });
        }
      })
      .finally(() => {
        setIsDeleting(false);
        setBillToDelete(null);
      });
  };


  if (isUserLoading || (user && isLoadingBills)) {
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
        <p className="text-muted-foreground mb-4">Please sign in to view your bill history.</p>
        <Button asChild>
          <Link href="/create-bill">Go to Bill Creation</Link>
        </Button>
      </div>
    );
  }
  
  if (billsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Error</h1>
        <p className="text-muted-foreground mb-4">Could not load bill history. Please try again later.</p>
        <p className="text-xs text-muted-foreground">{billsError.message}</p>
      </div>
    );
  }

  return (
    <AlertDialog open={!!billToDelete} onOpenChange={(isOpen) => !isOpen && setBillToDelete(null)}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <JMKTradingLogo className="h-8 w-8" />
              <span className="font-bold text-foreground">JMK Trading</span>
            </Link>
            <Button asChild>
              <Link href="/create-bill">Create New Bill</Link>
            </Button>
          </div>
        </header>
        <main className="container mx-auto p-4 md:p-8">
          <Card>
            <CardHeader>
              <CardTitle>Bill History</CardTitle>
              <CardDescription>A list of all your saved bills.</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedBills.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill #</TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedBills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">{bill.billNumber}</TableCell>
                          <TableCell>{bill.clientName}</TableCell>
                          <TableCell>
                            {bill.date ? format(new Date(bill.date.seconds * 1000), 'PPP') : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">₹{bill.totalAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <Button asChild variant="ghost" size="icon">
                              <Link href={`/bill/${bill.id}`} aria-label="View Bill">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setBillToDelete(bill.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold">No Bills Found</h3>
                  <p className="text-muted-foreground mt-2">You haven't saved any bills yet.</p>
                  <Button asChild className="mt-4">
                    <Link href="/create-bill">Create Your First Bill</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      <AlertDialogContent>
          <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bill
              and all of its associated data from our servers.
          </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteBill} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
          </AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
