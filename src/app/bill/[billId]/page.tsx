'use client';

import { useMemo, useState, use, useRef } from 'react';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Loader2, AlertCircle, QrCode, Share2, Download, RotateCw, ArrowLeft } from 'lucide-react';
import { BillPreview } from '@/components/bill-preview';
import type { BillFormValues } from '@/lib/schemas';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { Header } from '@/components/header';
import { useIsMobile } from '@/hooks/use-mobile';


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
  const isMobile = useIsMobile();
  const [isQrCodeOpen, setIsQrCodeOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isRotated, setIsRotated] = useState(false);
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
        useCORS: true, 
        allowTaint: true,
      });
      const data = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: isRotated ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(data, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`bill-${bill?.billNumber}.pdf`);
    } catch (e) {
      console.error(e)
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

  const DesktopHeader = () => (
    <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/bill/history"><ArrowLeft /></Link>
            </Button>
            <h1 className="text-lg font-semibold">Bill #{bill.billNumber}</h1>
        </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setIsRotated(!isRotated)}>
          <RotateCw className="mr-2 h-4 w-4" />
          Rotate
        </Button>
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
        <Button asChild>
          <Link href="/create-bill">Create New Bill</Link>
        </Button>
      </div>
    </div>
  );

  const MobileToolbar = () => (
     <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t p-2 flex justify-around items-center z-50">
        <Button variant="ghost" className="flex flex-col h-auto p-1" onClick={() => setIsRotated(!isRotated)}>
            <RotateCw />
            <span className="text-xs">Rotate</span>
        </Button>
        <Button variant="ghost" className="flex flex-col h-auto p-1" onClick={() => setIsQrCodeOpen(true)}>
            <QrCode />
            <span className="text-xs">QR Code</span>
        </Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex flex-col h-auto p-1">
                    <Share2 />
                    <span className="text-xs">Share</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center">
                <DropdownMenuItem onSelect={handleDownloadPdf} disabled={isDownloadingPdf}>
                    {isDownloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExportCsv}>CSV</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleShareWhatsApp}>WhatsApp</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleShareEmail}>Email</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );


  return (
    <>
      <Header />
      <main className="bg-muted/40 dark:bg-muted/10 p-2 sm:p-6 pb-24 sm:pb-8">
         {!isMobile && (
          <header className="max-w-6xl mx-auto mb-4 bg-background p-4 rounded-lg shadow-sm border">
            <DesktopHeader />
          </header>
         )}

        <div 
          className={cn(
            "max-w-4xl mx-auto transform-gpu transition-transform duration-300 origin-center",
            isRotated ? (isMobile ? 'rotate-90 scale-75' : 'rotate-90') : ''
          )}
          style={{
             ...(isRotated && isMobile && {
                // Adjust translation to keep it centered when rotated on mobile
                transform: `rotate(90deg) scale(0.6) translateY(-25%) translateX(15%)`,
                transformOrigin: 'center center'
             })
          }}
        >
          <div ref={printRef} className="shadow-lg">
            <BillPreview bill={bill} />
          </div>
        </div>
      </main>

      {isMobile && <MobileToolbar />}

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
