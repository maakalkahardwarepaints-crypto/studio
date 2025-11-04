
import { JMKTradingLogo } from "@/components/icons";
import { BillFormValues } from "@/lib/schemas";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BillPreviewProps {
  bill: BillFormValues;
}

const DISCLAIMER_THRESHOLD = 80000;

export function BillPreview({ bill }: BillPreviewProps) {
  const currency = bill.currency || "₹";
  const subtotal = bill.items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  const discountAmount = subtotal * ((Number(bill.discount) || 0) / 100);
  const totalAmount = subtotal - discountAmount;

  const status = bill.status || 'unpaid';
  const statusColors = {
    paid: 'text-green-600 border-green-600',
    unpaid: 'text-red-600 border-red-600',
    pending: 'text-orange-600 border-orange-600',
  }

  return (
    <div className="bg-white text-black p-4 sm:p-6 rounded-lg max-w-4xl mx-auto font-sans text-sm print:shadow-none print:rounded-none relative overflow-hidden">
      
      {/* Status Stamp */}
      <div className={cn(
          "absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 z-0",
          "flex items-center justify-center w-[200%] h-[200%]",
      )}>
          <div className={cn(
              "text-center text-7xl sm:text-9xl font-bold uppercase border-4 rounded-lg p-4 sm:p-8 opacity-10",
              "transform -rotate-[30deg] scale-75 sm:scale-100",
              statusColors[status]
          )}>
              {status}
          </div>
      </div>

      <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
            <div className="flex items-center gap-3">
               <JMKTradingLogo className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
               <div>
                  <h1 className="text-lg sm:text-xl font-bold">{bill.sellerName}</h1>
                  <p className="text-gray-600 text-[10px] sm:text-xs max-w-[200px] sm:max-w-xs">{bill.sellerAddress}</p>
                  {bill.sellerShopNumber && <p className="text-gray-600 text-[10px] sm:text-xs">Contact: {bill.sellerShopNumber}</p>}
                  {bill.sellerOwnerNumber && <p className="text-gray-600 text-[10px] sm:text-xs">Owner: {bill.sellerOwnerNumber}</p>}
               </div>
            </div>
            <div className="text-left sm:text-right w-full sm:w-auto">
              <h2 className="text-xl sm:text-2xl font-bold uppercase text-gray-700">Invoice</h2>
              <p className="text-xs">Bill #: <span className="font-medium">{bill.billNumber}</span></p>
              <p className="text-xs">Date: <span className="font-medium">{format(bill.date, "PPP")}</span></p>
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-6 p-3 bg-gray-50 rounded-md">
            <h3 className="font-bold text-gray-700 mb-1 text-xs">Bill To:</h3>
            <p className="font-bold text-sm">{bill.clientName}</p>
            <p className="text-xs text-gray-600">{bill.clientAddress}</p>
            {bill.clientPhone && <p className="text-xs text-gray-600">Phone: {bill.clientPhone}</p>}
            {bill.clientEmail && <p className="text-xs text-gray-600">Email: {bill.clientEmail}</p>}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <Table className="text-xs sm:text-sm">
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="w-[40px] p-2">S.No</TableHead>
                  <TableHead className="w-[45%] p-2">Item Description</TableHead>
                  <TableHead className="text-right p-2">Qty</TableHead>
                  <TableHead className="text-right p-2">Rate</TableHead>
                  <TableHead className="text-right p-2">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items.map((item, index) => {
                  const quantity = Number(item.quantity) || 0;
                  const rate = Number(item.rate) || 0;
                  const amount = quantity * rate;
                  return (
                    <TableRow key={index} className="[&_td]:p-2">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium break-words">{item.itemName}</TableCell>
                      <TableCell className="text-right">{quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{currency}{(rate).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">{currency}{amount.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>


          {/* Total */}
          <div className="flex justify-end mt-4 mb-6">
            <div className="w-full max-w-[250px] space-y-1 text-sm">
              <div className="flex justify-between py-1">
                <span className="font-medium text-gray-600">Subtotal</span>
                <span className="font-medium">{currency}{subtotal.toFixed(2)}</span>
              </div>
               {bill.discount && bill.discount > 0 && (
                <div className="flex justify-between py-1">
                  <span className="font-medium text-gray-600">Discount ({bill.discount}%)</span>
                  <span className="font-medium text-red-600">- {currency}{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1 bg-gray-300"/>
              <div className="flex justify-between py-1">
                <span className="font-bold text-base sm:text-lg">Total</span>
                <span className="font-bold text-base sm:text-lg">{currency}{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
           {/* AI Summary */}
          {bill.aiSummary && (
            <div className="mb-6">
              <Separator className="my-4 bg-gray-300" />
              <div className="p-3 bg-gray-50 rounded-md">
                <h3 className="font-bold text-gray-700 mb-2 text-xs">AI-Generated Summary</h3>
                <p className="text-xs italic text-gray-600">
                    {bill.aiSummary}
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <Separator className="my-4 bg-gray-300" />
          <div className="text-center text-gray-600">
            <p className="font-bold mb-2 text-sm">Thank you for your business!</p>
            {totalAmount > DISCLAIMER_THRESHOLD && (
              <p className="text-[10px] italic max-w-md mx-auto">
                This is not a GST invoice. For bills over {currency}{DISCLAIMER_THRESHOLD}, please consult your tax advisor regarding compliance.
              </p>
            )}
          </div>
        </div>
    </div>
  );
}
