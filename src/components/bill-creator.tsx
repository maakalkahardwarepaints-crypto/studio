"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BillFormValues, billFormSchema } from "@/lib/schemas";
import { getBillSummaryAction, saveBillAction } from "@/lib/actions";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Plus, Share2, Trash2, FileText, BrainCircuit, Download, History, Percent } from "lucide-react";
import { format } from "date-fns";
import { BillPreview } from "./bill-preview";
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
import { useUser, useAuth } from "@/firebase";
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";


export function BillCreator() {
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [summary, setSummary] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();


  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      sellerName: "J M K Trading",
      sellerAddress: "123 Market St, Anytown, USA",
      sellerShopNumber: "S-15",
      sellerOwnerNumber: "+1 (555) 123-4567",
      clientName: "",
      clientAddress: "",
      billNumber: `BILL-${new Date().getTime()}`,
      date: new Date(),
      items: [{ itemName: "", quantity: 1, rate: 0, cost: 0 }],
      discount: 0,
    },
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const watchDiscount = form.watch("discount");

  const subtotal = watchItems.reduce((acc, current) => {
    const quantity = parseFloat(String(current.quantity)) || 0;
    const rate = parseFloat(String(current.rate)) || 0;
    return acc + quantity * rate;
  }, 0);
  
  const discountAmount = subtotal * ((parseFloat(String(watchDiscount)) || 0) / 100);
  const totalAmount = subtotal - discountAmount;

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) {
      toast({ title: "Error", description: "Could not find bill to print.", variant: "destructive" });
      return;
    }

    setIsDownloadingPdf(true);
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
    });
    const data = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(data, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`bill-${form.getValues("billNumber")}.pdf`);
    setIsDownloadingPdf(false);
  };

  const handleGenerateSummary = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Invalid Form",
        description: "Please fill all required fields before generating a summary.",
        variant: "destructive",
      });
      return;
    }

    setIsSummaryLoading(true);
    setSummary("");

    const result = await getBillSummaryAction(form.getValues());

    if ("error" in result) {
      toast({
        title: "AI Summary Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setSummary(result.summary);
      setIsSummaryDialogOpen(true);
    }
    setIsSummaryLoading(false);
  };
  
  const handlePreview = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Invalid Form",
        description: "Please fill all required fields to see a preview.",
        variant: "destructive",
      });
      return;
    }
    setIsPreviewOpen(true);
  }

  const handleSaveBill = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Invalid Form",
        description: "Please fill all required fields to save the bill.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "You must be signed in to save a bill.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const result = await saveBillAction(form.getValues(), user.uid);
    setIsSaving(false);

    if ("error" in result) {
      toast({
        title: "Save Failed",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Bill Saved!",
        description: "Your bill has been successfully saved.",
      });
      router.push(`/bill/${result.billId}`);
    }
  };


  return (
    <FormProvider {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seller Details */}
          <Card>
            <CardHeader>
              <CardTitle>Seller Details</CardTitle>
              <CardDescription>Enter your company's information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField name="sellerName" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="sellerAddress" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Company Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField name="sellerShopNumber" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Shop Number (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="sellerOwnerNumber" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Owner Number (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Client Details */}
          <Card>
            <CardHeader>
              <CardTitle>Client Details</CardTitle>
              <CardDescription>Enter the client's information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField name="clientName" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="clientAddress" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Client Address</FormLabel><FormControl><Textarea placeholder="456 Client Ave, Othertown, USA" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField name="billNumber" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Bill Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="date" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-col pt-2"><FormLabel>Bill Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                      </PopoverContent>
                    </Popover><FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bill Items */}
        <Card>
          <CardHeader>
            <CardTitle>Bill Items</CardTitle>
            <CardDescription>Add items to the bill. All prices are GST-free.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">Item Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const item = watchItems[index];
                    const quantity = parseFloat(String(item?.quantity)) || 0;
                    const rate = parseFloat(String(item?.rate)) || 0;
                    const amount = quantity * rate;
                    return (
                      <TableRow key={field.id}>
                        <TableCell><FormField name={`items.${index}.itemName`} control={form.control} render={({ field }) => (<Input placeholder="E.g. T-Shirt" {...field} />)} /><FormMessage className="text-xs" /></TableCell>
                        <TableCell><FormField name={`items.${index}.quantity`} control={form.control} render={({ field }) => (<Input type="number" placeholder="1" {...field} />)} /><FormMessage className="text-xs" /></TableCell>
                        <TableCell><FormField name={`items.${index}.cost`} control={form.control} render={({ field }) => (<Input type="number" placeholder="10.00" {...field} />)} /><FormMessage className="text-xs" /></TableCell>
                        <TableCell><FormField name={`items.${index}.rate`} control={form.control} render={({ field }) => (<Input type="number" placeholder="15.00" {...field} />)} /><FormMessage className="text-xs" /></TableCell>
                        <TableCell className="text-right font-medium">₹{amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1} aria-label="Remove item">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ itemName: "", quantity: 1, rate: 0, cost: 0 })}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
            {form.formState.errors.items && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.items.root?.message}</p>}
          </CardContent>
          <CardFooter className="flex flex-col items-end space-y-2">
             <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <FormField name="discount" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount (%)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" placeholder="0" {...field} className="pl-8" />
                        <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
            </div>
            <div className="flex justify-between w-full max-w-sm text-lg">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>
             <div className="flex justify-between w-full max-w-sm text-md">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-semibold text-destructive">- ₹{discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-full max-w-sm text-xl font-bold">
              <span>Total</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Preview, save, or share the bill.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
             <Button type="button" onClick={handlePreview}>
              <FileText className="mr-2" /> Preview Bill
            </Button>
            <Button type="button" onClick={handleGenerateSummary} disabled={isSummaryLoading}>
              {isSummaryLoading ? (<Loader2 className="mr-2 animate-spin" />) : (<BrainCircuit className="mr-2" />)}
              Generate AI Summary
            </Button>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Share2 className="mr-2" /> Share Bill
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={handleDownloadPdf} disabled={isDownloadingPdf}>
                  {isDownloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast({title: "Coming Soon!", description: "Excel sharing will be available soon."})}>As Excel</DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => toast({title: "Coming Soon!", description: "WhatsApp sharing will be available soon."})}>Via WhatsApp</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast({title: "Coming Soon!", description: "Email sharing will be available soon."})}>Via Email</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleSaveBill} disabled={isSaving || isUserLoading}>
              {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
              Save Bill
            </Button>
             <Button variant="secondary" asChild>
              <Link href="/bill/history">
                <History className="mr-2" />
                View History
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <AlertDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <AlertDialogContent className="max-w-4xl p-0 border-0">
                <AlertDialogHeader className="p-6 pb-0">
                    <AlertDialogTitle>Bill Preview</AlertDialogTitle>
                    <AlertDialogDescription>
                        A preview of how your bill will appear.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="px-6">
                  <BillPreview bill={form.getValues()} />
                </div>
                <AlertDialogFooter className="p-4 bg-slate-50 dark:bg-slate-800 rounded-b-lg">
                    <AlertDialogCancel>Close</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* AI Summary Dialog */}
        <AlertDialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>AI Bill Summary</AlertDialogTitle>
                    <AlertDialogDescription className="text-foreground">
                        {summary}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Printable Bill Preview */}
        <div className="absolute -z-50 left-[-10000px] top-0">
          <div ref={printRef}>
              <BillPreview bill={form.getValues()} />
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
