"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BillFormValues, billFormSchema, type Client } from "@/lib/schemas";
import { getBillSummaryAction } from "@/lib/actions";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Plus, Share2, Trash2, FileText, BrainCircuit, Download, History, Percent, DollarSign, ChevronsUpDown } from "lucide-react";
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
import { useUser, useAuth, useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from "@/firebase";
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const companyProfiles = {
    "JMK Trading": {
        address: "Shop No 3-4, Pliot No -1,Kh. No.796,Asola Bandh Road, Fatehpur Beri,New Delhi -110074",
        shopNumber: "011-41079296",
        ownerNumber: "7479633348",
    },
    "Maa Kalka Hadware & Paints": {
        address: "Shop No 3-4, Pliot No -1,Kh. No.796,Asola Bandh Road, Fatehpur Beri,New Delhi -110074",
        shopNumber: "011-41079296",
        ownerNumber: "7479633348",
    },
};

const currencies = [
    { value: "₹", label: "INR (₹)" },
    { value: "$", label: "USD ($)" },
    { value: "€", label: "EUR (€)" },
    { value: "£", label: "GBP (£)" },
]

export function BillCreator() {
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [summary, setSummary] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>("JMK Trading");
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);

  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const clientsCollection = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/clients`);
  }, [firestore, user]);

  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsCollection);

  useEffect(() => {
    if (!isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      sellerName: "JMK Trading",
      sellerAddress: "Shop No 3-4, Pliot No -1,Kh. No.796,Asola Bandh Road, Fatehpur Beri,New Delhi -110074",
      sellerShopNumber: "011-41079296",
      sellerOwnerNumber: "7479633348",
      clientName: "",
      clientAddress: "",
      billNumber: "",
      date: new Date(),
      items: [{ itemName: "", quantity: 1, rate: 0, cost: 0 }],
      discount: 0,
      currency: "₹",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    // Generate a unique bill number only on the client-side
    if (typeof window !== 'undefined') {
        const currentBillNumber = form.getValues("billNumber");
        if (!currentBillNumber) {
            const timestamp = new Date().getTime();
            form.setValue("billNumber", `BILL-${timestamp}`);
        }
    }
  }, [form]);

  const handleCompanyChange = (value: string) => {
    setSelectedCompany(value);
    if (value in companyProfiles) {
      const profile = companyProfiles[value as keyof typeof companyProfiles];
      form.setValue("sellerName", value);
      form.setValue("sellerAddress", profile.address);
      form.setValue("sellerShopNumber", profile.shopNumber);
      form.setValue("sellerOwnerNumber", profile.ownerNumber);
    } else { // "Other"
      form.setValue("sellerName", "");
      form.setValue("sellerAddress", "");
      form.setValue("sellerShopNumber", "");
      form.setValue("sellerOwnerNumber", "");
    }
  };

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchItems = form.watch("items");
  const watchDiscount = form.watch("discount");
  const watchCurrency = form.watch("currency");
  const watchClientName = form.watch("clientName");

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
  
    if (!user || !firestore) {
      toast({
        title: "Not Authenticated",
        description: "You must be signed in to save a bill.",
        variant: "destructive",
      });
      return;
    }
  
    setIsSaving(true);
  
    const billData = form.getValues();
    const subtotal = billData.items.reduce(
      (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
    const discountAmount = subtotal * ((Number(billData.discount) || 0) / 100);
    const totalAmount = subtotal - discountAmount;
  
    const userBillsCollection = collection(firestore, `users/${user.uid}/bills`);
    const newBillRef = doc(userBillsCollection);
  
    const billPayload: any = {
      id: newBillRef.id,
      sellerName: billData.sellerName,
      sellerAddress: billData.sellerAddress,
      clientName: billData.clientName,
      clientAddress: billData.clientAddress,
      billNumber: billData.billNumber,
      date: billData.date,
      totalAmount,
      discount: billData.discount || 0,
      currency: billData.currency,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  
    if (billData.sellerShopNumber) billPayload.sellerShopNumber = billData.sellerShopNumber;
    if (billData.sellerOwnerNumber) billPayload.sellerOwnerNumber = billData.sellerOwnerNumber;
  
    setDoc(newBillRef, billPayload)
      .then(() => {
        const itemsCollection = collection(newBillRef, 'items');
        const itemPromises = billData.items.map((item) => {
          const itemData = {
            id: doc(itemsCollection).id,
            itemName: item.itemName,
            quantity: Number(item.quantity) || 0,
            rate: Number(item.rate) || 0,
            cost: Number(item.cost) || 0,
          };
          const itemDocRef = doc(itemsCollection, itemData.id);
          return setDoc(itemDocRef, itemData).catch((serverError) => {
            const permissionError = new FirestorePermissionError({
              path: itemDocRef.path,
              operation: 'create',
              requestResourceData: itemData,
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
          });
        });
  
        return Promise.all(itemPromises);
      })
      .then(() => {
        toast({
          title: "Bill Saved!",
          description: "Your bill has been successfully saved.",
        });
        router.push(`/bill/${newBillRef.id}`);
      })
      .catch((error) => {
        if (!(error instanceof FirestorePermissionError)) {
            const permissionError = new FirestorePermissionError({
                path: newBillRef.path,
                operation: 'create',
                requestResourceData: billPayload,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        setIsSaving(false);
      });
  };

  const handleExportCsv = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({ title: "Invalid Form", description: "Please fill out the form correctly before exporting.", variant: "destructive" });
      return;
    }
    const billData = form.getValues();
    const headers = ["Item Name", "Quantity", "Rate", "Amount"];
    const rows = billData.items.map(item => {
      const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      return [item.itemName, item.quantity, item.rate, amount.toFixed(2)].join(',');
    });

    const subtotalRow = `\nSubtotal,,,"${subtotal.toFixed(2)}"`;
    const discountRow = `Discount (${billData.discount || 0}%),,,"-${discountAmount.toFixed(2)}"`;
    const totalRow = `Total,,,"${totalAmount.toFixed(2)}"`;

    const csvContent = [headers.join(','), ...rows, subtotalRow, discountRow, totalRow].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `bill-${billData.billNumber}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareWhatsApp = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({ title: "Invalid Form", description: "Please fill out the form correctly before sharing.", variant: "destructive" });
      return;
    }
    const billData = form.getValues();
    let message = `*Invoice from ${billData.sellerName}*\n\n`;
    message += `Bill To: ${billData.clientName}\n`;
    message += `Bill #: ${billData.billNumber}\n`;
    message += `Date: ${format(billData.date, "PPP")}\n\n`;
    message += "*Items:*\n";
    billData.items.forEach(item => {
      const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      message += `- ${item.itemName} (Qty: ${item.quantity}, Rate: ${watchCurrency}${item.rate}) - ${watchCurrency}${amount.toFixed(2)}\n`;
    });
    message += `\nSubtotal: ${watchCurrency}${subtotal.toFixed(2)}`;
    if (billData.discount && billData.discount > 0) {
      message += `\nDiscount (${billData.discount}%): -${watchCurrency}${discountAmount.toFixed(2)}`;
    }
    message += `\n*Total: ${watchCurrency}${totalAmount.toFixed(2)}*\n\n`;
    message += `Thank you for your business!`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareEmail = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
        toast({ title: "Invalid Form", description: "Please fill out the form correctly before sharing.", variant: "destructive" });
        return;
    }
    const billData = form.getValues();
    const subject = `Invoice from ${billData.sellerName} - Bill #${billData.billNumber}`;
    let body = `Hello ${billData.clientName},\n\nPlease find your invoice details below:\n\n`;
    body += `Bill #: ${billData.billNumber}\n`;
    body += `Date: ${format(billData.date, "PPP")}\n\n`;
    body += "----------------------------------------\n";
    billData.items.forEach(item => {
        const amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
        body += `Item: ${item.itemName}\n`;
        body += `Qty: ${item.quantity}\n`;
        body += `Rate: ${watchCurrency}${(Number(item.rate) || 0).toFixed(2)}\n`;
        body += `Amount: ${watchCurrency}${amount.toFixed(2)}\n\n`;
    });
    body += "----------------------------------------\n";
    body += `Subtotal: ${watchCurrency}${subtotal.toFixed(2)}\n`;
    if (billData.discount && billData.discount > 0) {
        body += `Discount (${billData.discount}%): -${watchCurrency}${discountAmount.toFixed(2)}\n`;
    }
    body += `Total: ${watchCurrency}${totalAmount.toFixed(2)}\n\n`;
    body += `Thank you for your business!\n\nBest regards,\n${billData.sellerName}`;

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seller Details */}
          <Card>
            <CardHeader>
              <CardTitle>Seller Details</CardTitle>
              <CardDescription>Select a company profile or enter new details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormItem>
                <FormLabel>Company Profile</FormLabel>
                <Select onValueChange={handleCompanyChange} defaultValue={selectedCompany}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="JMK Trading">JMK Trading</SelectItem>
                    <SelectItem value="Maa Kalka Hadware & Paints">Maa Kalka Hadware & Paints</SelectItem>
                    <SelectItem value="other">Other (Enter manually)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>

              {selectedCompany === "other" && (
                <FormField name="sellerName" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl><Input {...field} placeholder="Your Company Name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
              
              <FormField name="sellerAddress" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Company Address</FormLabel><FormControl><Textarea {...field} readOnly={selectedCompany !== 'other'} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField name="sellerShopNumber" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Contact (Optional)</FormLabel><FormControl><Input {...field} readOnly={selectedCompany !== 'other'} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="sellerOwnerNumber" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Owner Number (Optional)</FormLabel><FormControl><Input {...field} readOnly={selectedCompany !== 'other'} /></FormControl><FormMessage /></FormItem>
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
               <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? clients?.find(
                                  (client) => client.name === field.value
                                )?.name
                              : "Select or type client name"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Search client..." 
                            onValueChange={(search) => form.setValue("clientName", search)}
                            value={watchClientName}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {isLoadingClients ? 'Loading...' : 'No client found.'}
                            </CommandEmpty>
                            <CommandGroup>
                              {clients?.filter(client => client.name.toLowerCase().includes(watchClientName.toLowerCase()))
                                .map((client) => (
                                <CommandItem
                                  value={client.name}
                                  key={client.id}
                                  onSelect={() => {
                                    form.setValue("clientName", client.name);
                                    form.setValue("clientAddress", client.address);
                                    setIsClientPopoverOpen(false);
                                  }}
                                >
                                  {client.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                             <CommandGroup>
                                <CommandItem onSelect={() => setIsClientPopoverOpen(false)}>
                                  Use "{watchClientName}"
                                </CommandItem>
                             </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField name="clientAddress" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Client Address</FormLabel><FormControl><Textarea placeholder="456 Client Ave, Othertown, USA" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField name="billNumber" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Bill Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="date" control={form.control} render={({ field }) => (
                  <FormItem className="flex flex-col pt-2"><FormLabel>Bill Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}>
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
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">S.No</TableHead>
                    <TableHead className="min-w-[250px]">Item Name</TableHead>
                    <TableHead>Qty</TableHead>
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
                        <TableCell>{index + 1}</TableCell>
                        <TableCell><FormField name={`items.${index}.itemName`} control={form.control} render={({ field }) => (<Input placeholder="E.g. T-Shirt" {...field} />)} /><FormMessage className="text-xs" /></TableCell>
                        <TableCell><FormField name={`items.${index}.quantity`} control={form.control} render={({ field }) => (<Input type="number" placeholder="1" {...field} value={String(field.value ?? '')} onChange={(e) => field.onChange(e.target.valueAsNumber)} />)} /><FormMessage className="text-xs" /></TableCell>
                        <TableCell><FormField name={`items.${index}.cost`} control={form.control} render={({ field }) => (<Input type="number" placeholder="10.00" {...field} value={String(field.value ?? '')} onChange={(e) => field.onChange(e.target.valueAsNumber)} />)} /><FormMessage className="text-xs" /></TableCell>
                        <TableCell><FormField name={`items.${index}.rate`} control={form.control} render={({ field }) => (<Input type="number" placeholder="15.00" {...field} value={String(field.value ?? '')} onChange={(e) => field.onChange(e.target.valueAsNumber)} />)} /><FormMessage className="text-xs" /></TableCell>
                        <TableCell className="text-right font-medium">{watchCurrency}{amount.toFixed(2)}</TableCell>
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {fields.map((field, index) => {
                const item = watchItems[index];
                const quantity = parseFloat(String(item?.quantity)) || 0;
                const rate = parseFloat(String(item?.rate)) || 0;
                const amount = quantity * rate;
                return (
                  <Card key={field.id} className="relative pt-8">
                    <span className="absolute top-2 left-3 font-bold text-muted-foreground">#{index + 1}</span>
                    <CardContent className="space-y-4">
                      <FormField name={`items.${index}.itemName`} control={form.control} render={({ field }) => (
                          <FormItem>
                              <FormLabel>Item Name</FormLabel>
                              <FormControl><Input placeholder="E.g. T-Shirt" {...field} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField name={`items.${index}.quantity`} control={form.control} render={({ field }) => (
                           <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl><Input type="number" placeholder="1" {...field} value={String(field.value ?? '')} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl>
                              <FormMessage />
                          </FormItem>
                        )} />
                         <FormField name={`items.${index}.cost`} control={form.control} render={({ field }) => (
                           <FormItem>
                              <FormLabel>Cost</FormLabel>
                              <FormControl><Input type="number" placeholder="10.00" {...field} value={String(field.value ?? '')} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl>
                              <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                       <FormField name={`items.${index}.rate`} control={form.control} render={({ field }) => (
                           <FormItem>
                              <FormLabel>Rate</FormLabel>
                              <FormControl><Input type="number" placeholder="15.00" {...field} value={String(field.value ?? '')} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl>
                              <FormMessage />
                          </FormItem>
                        )} />
                    </CardContent>
                    <CardFooter className="flex justify-between items-center bg-muted/50 p-3">
                        <span className="font-medium">Amount: {watchCurrency}{amount.toFixed(2)}</span>
                         <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1} aria-label="Remove item" className="absolute top-2 right-2">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>

            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ itemName: "", quantity: 1, rate: 0, cost: 0 })}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
            {form.formState.errors.items && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.items.root?.message}</p>}
          </CardContent>
          <CardFooter className="flex flex-col items-end space-y-2">
             <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField name="discount" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount (%)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" placeholder="0" {...field} className="pl-8" value={String(field.value ?? '')} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                        <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
            </div>
            <div className="flex justify-between w-full max-w-sm text-lg">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{watchCurrency}{subtotal.toFixed(2)}</span>
            </div>
             <div className="flex justify-between w-full max-w-sm text-md">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-semibold text-destructive">- {watchCurrency}{discountAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-full max-w-sm text-xl font-bold">
              <span>Total</span>
              <span>{watchCurrency}{totalAmount.toFixed(2)}</span>
            </div>
          </CardFooter>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Preview, save, or share the bill.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row flex-wrap gap-4">
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
                <DropdownMenuItem onSelect={handleExportCsv}>As Excel (CSV)</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleShareWhatsApp}>Via WhatsApp</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleShareEmail}>Via Email</DropdownMenuItem>
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
            <Button variant="secondary" asChild>
              <Link href="/profit-loss">
                <DollarSign className="mr-2" />
                View Profit/Loss
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <AlertDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <AlertDialogContent className="max-w-4xl w-[95%] p-0 border-0">
                <AlertDialogHeader className="p-6 pb-0">
                    <AlertDialogTitle>Bill Preview</AlertDialogTitle>
                    <AlertDialogDescription>
                        A preview of how your bill will appear.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="px-2 sm:px-6 overflow-y-auto max-h-[70vh]">
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
