'use client';

import { useMemo, useState, use } from 'react';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Loader2, AlertCircle, QrCode, Share2, Download } from 'lucide-react';
import { BillPreview } from '@/components/bill-preview';
import type { BillFormValues } from '@/lib/schemas';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { JMKTradingLogo } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import QRCode from "qrcode.react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns";


interface BillPageProps {
  params: {
    billId: string;
  };
}

export default function BillPage({ params: paramsProp }: BillPageProps) {
  const params = use(paramsProp);
  const { billId } = params;
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isQrCodeOpen, setIsQrCodeOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const billUrl = typeof window !== 'undefined' && user ? `${window.location.origin}/public/bill/${user.uid}/${billId}` : '';


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
      currency: billData.currency || "₹",
    } as BillFormValues;
  }, [billData, itemsData]);

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) {
      toast({ title: "Error", description: "Could not find bill to print.", variant: "destructive" });
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
      });
      const data = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(data, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`bill-${bill?.billNumber}.pdf`);
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleExportCsv = () => {
    if (!bill) {
      toast({ title: "Error", description: "Bill data not available.", variant: "destructive" });
      return;
    }
    const headers = ["Item Name", "Quantity", "Rate", "Amount"];
    const rows = bill.items.map(item => {
      const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      return [item.itemName, item.quantity, item.rate, amount.toFixed(2)].join(',');
    });

    const subtotal = bill.items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
    const discountAmount = subtotal * ((Number(bill.discount) || 0) / 100);
    const totalAmount = subtotal - discountAmount;
    
    const subtotalRow = `\nSubtotal,,,"${subtotal.toFixed(2)}"`;
    const discountRow = `Discount (${bill.discount || 0}%),,,"-${discountAmount.toFixed(2)}"`;
    const totalRow = `Total,,,"${totalAmount.toFixed(2)}"`;

    const csvContent = [headers.join(','), ...rows, subtotalRow, discountRow, totalRow].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bill-${bill.billNumber}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareWhatsApp = () => {
    if (!bill) {
      toast({ title: "Error", description: "Bill data not available.", variant: "destructive" });
      return;
    }
    const subtotal = bill.items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
    const discountAmount = subtotal * ((Number(bill.discount) || 0) / 100);
    const totalAmount = subtotal - discountAmount;
    const currency = bill.currency || "₹";

    let message = `*Invoice from ${bill.sellerName}*\n\n`;
    message += `Bill To: ${bill.clientName}\n`;
    message += `Bill #: ${bill.billNumber}\n`;
    message += `Date: ${format(bill.date, "PPP")}\n\n`;
    message += "*Items:*\n";
    bill.items.forEach(item => {
      const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      message += `- ${item.itemName} (Qty: ${item.quantity}, Rate: ${currency}${item.rate}) - ${currency}${amount.toFixed(2)}\n`;
    });
    message += `\nSubtotal: ${currency}${subtotal.toFixed(2)}`;
    if (bill.discount && bill.discount > 0) {
      message += `\nDiscount (${bill.discount}%): -${currency}${discountAmount.toFixed(2)}`;
    }
    message += `\n*Total: ${currency}${totalAmount.toFixed(2)}*\n\n`;
    message += `Thank you for your business!\n\n`;
    message += `View the full bill here: ${billUrl}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareEmail = () => {
    if (!bill) {
      toast({ title: "Error", description: "Bill data not available.", variant: "destructive" });
      return;
    }
    const subtotal = bill.items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
    const discountAmount = subtotal * ((Number(bill.discount) || 0) / 100);
    const totalAmount = subtotal - discountAmount;
    const currency = bill.currency || "₹";

    const subject = `Invoice from ${bill.sellerName} - Bill #${bill.billNumber}`;
    let body = `Hello ${bill.clientName},\n\nPlease find your invoice details below:\n\n`;
    body += `Bill #: ${bill.billNumber}\n`;
    body += `Date: ${format(bill.date, "PPP")}\n\n`;
    body += `You can also view the full bill online here: ${billUrl}\n\n`;
    body += "----------------------------------------\n";
    bill.items.forEach(item => {
        const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
        body += `Item: ${item.itemName}\n`;
        body += `Qty: ${item.quantity}\n`;
        body += `Rate: ${currency}${(Number(item.rate) || 0).toFixed(2)}\n`;
        body += `Amount: ${currency}${amount.toFixed(2)}\n\n`;
    });
    body += "----------------------------------------\n";
    body += `Subtotal: ${currency}${subtotal.toFixed(2)}\n`;
    if (bill.discount && bill.discount > 0) {
        body += `Discount (${bill.discount}%): -${currency}${discountAmount.toFixed(2)}\n`;
    }
    body += `Total: ${currency}${totalAmount.toFixed(2)}\n\n`;
    body += `Thank you for your business!\n\nBest regards,\n${bill.sellerName}`;

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

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
    <>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-8">
        <header className="max-w-4xl mx-auto mb-4">
          <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-2">
                  <JMKTradingLogo className="h-8 w-8" />
                  <span className="font-bold text-foreground">JMK Trading</span>
              </Link>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsQrCodeOpen(true)}>
                <QrCode className="mr-2 h-4 w-4" />
                QR Code
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Share2 className="mr-2 h-4 w-4" /> Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={handleDownloadPdf} disabled={isDownloadingPdf}>
                    {isDownloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleExportCsv}>Export as CSV</DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleShareWhatsApp}>Share via WhatsApp</DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleShareEmail}>Share via Email</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button asChild variant="outline">
                <Link href="/bill/history">View History</Link>
              </Button>
              <Button asChild>
                <Link href="/create-bill">Create New Bill</Link>
              </Button>
            </div>
          </div>
        </header>
        <div ref={printRef}>
          <BillPreview bill={bill} />
        </div>
      </div>

      <AlertDialog open={isQrCodeOpen} onOpenChange={setIsQrCodeOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Share Bill with QR Code</AlertDialogTitle>
                  <AlertDialogDescription>
                      Anyone can scan this QR code with a mobile device to view a read-only version of the bill.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center justify-center p-4">
                  {billUrl ? <QRCode value={billUrl} size={256} level="H" /> : <Loader2 className="animate-spin" />}
              </div>
              <AlertDialogFooter>
                  <AlertDialogCancel>Close</AlertDialogCancel>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
