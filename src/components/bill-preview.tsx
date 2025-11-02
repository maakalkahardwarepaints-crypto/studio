import { JMKTradingLogo } from "@/components/icons";
import { BillFormValues } from "@/lib/schemas";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface BillPreviewProps {
  bill: BillFormValues;
}

const DISCLAIMER_THRESHOLD = 80000;

export function BillPreview({ bill }: BillPreviewProps) {
  const currency = bill.currency || "₹";
  const subtotal = bill.items.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  const discountAmount = subtotal * ((Number(bill.discount) || 0) / 100);
  const totalAmount = subtotal - discountAmount;

  return (
    <div className="bg-white text-black p-4 sm:p-8 rounded-lg max-w-4xl mx-auto font-sans text-sm sm:text-base">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{bill.sellerName}</h1>
          <p className="text-gray-600 text-xs sm:text-sm">{bill.sellerAddress}</p>
          {bill.sellerShopNumber && <p className="text-gray-600 text-xs sm:text-sm">Contact: {bill.sellerShopNumber}</p>}
          {bill.sellerOwnerNumber && <p className="text-gray-600 text-xs sm:text-sm">Owner No: {bill.sellerOwnerNumber}</p>}
        </div>
        <div className="text-left sm:text-right w-full sm:w-auto">
          <h2 className="text-2xl sm:text-3xl font-bold uppercase text-gray-700">Invoice</h2>
          <p className="text-xs sm:text-sm">Bill #: {bill.billNumber}</p>
          <p className="text-xs sm:text-sm">Date: {format(bill.date, "PPP")}</p>
        </div>
      </div>

      {/* Client Info */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-700 mb-1">Bill To:</h3>
        <p className="font-bold">{bill.clientName}</p>
        <p className="text-xs sm:text-sm">{bill.clientAddress}</p>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <Table className="mb-8 min-w-[600px]">
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead className="w-[60px]">S.No</TableHead>
              <TableHead className="w-[45%]">Item Description</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bill.items.map((item, index) => {
              const quantity = Number(item.quantity) || 0;
              const rate = Number(item.rate) || 0;
              const amount = quantity * rate;
              return (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.itemName}</TableCell>
                  <TableCell className="text-right">{quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{currency}{(rate).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{currency}{amount.toFixed(2)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>


      {/* Total */}
      <div className="flex justify-end mb-8">
        <div className="w-full max-w-xs space-y-2">
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
          <Separator className="my-2 bg-gray-300"/>
          <div className="flex justify-between py-1">
            <span className="font-bold text-lg sm:text-xl">Total</span>
            <span className="font-bold text-lg sm:text-xl">{currency}{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Separator className="my-8 bg-gray-300" />
      <div className="text-center text-gray-600">
        <p className="font-bold mb-2">Thank you for your business!</p>
        {totalAmount > DISCLAIMER_THRESHOLD && (
          <p className="text-xs italic">
            This is not a GST invoice. For bills over ₹{DISCLAIMER_THRESHOLD}, please consult your tax advisor regarding compliance.
          </p>
        )}
      </div>
    </div>
  );
}
