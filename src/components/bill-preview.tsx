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
  const totalAmount = bill.items.reduce((acc, item) => acc + item.quantity * item.rate, 0);

  return (
    <div className="bg-white text-black p-8 rounded-lg max-w-4xl mx-auto font-sans text-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          <JMKTradingLogo className="h-16 w-16" />
          <div>
            <h1 className="text-2xl font-bold">{bill.sellerName}</h1>
            <p className="text-gray-600">{bill.sellerAddress}</p>
            {bill.sellerShopNumber && <p className="text-gray-600">Shop No: {bill.sellerShopNumber}</p>}
            {bill.sellerOwnerNumber && <p className="text-gray-600">Contact: {bill.sellerOwnerNumber}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase text-gray-700">Invoice</h2>
          <p>Bill #: {bill.billNumber}</p>
          <p>Date: {format(bill.date, "PPP")}</p>
        </div>
      </div>

      {/* Client Info */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-700 mb-1">Bill To:</h3>
        <p className="font-bold">{bill.clientName}</p>
        <p>{bill.clientAddress}</p>
      </div>

      {/* Items Table */}
      <Table className="mb-8">
        <TableHeader className="bg-gray-100">
          <TableRow>
            <TableHead className="w-[50%]">Item Description</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bill.items.map((item, index) => {
            const amount = item.quantity * item.rate;
            return (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-right">₹{item.rate.toFixed(2)}</TableCell>
                <TableCell className="text-right">₹{amount.toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Total */}
      <div className="flex justify-end mb-8">
        <div className="w-full max-w-xs">
          <div className="flex justify-between py-2">
            <span className="font-medium text-gray-600">Subtotal</span>
            <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
          </div>
          <Separator className="my-2 bg-gray-300"/>
          <div className="flex justify-between py-2">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-lg">₹{totalAmount.toFixed(2)}</span>
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
