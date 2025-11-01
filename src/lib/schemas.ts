import { z } from "zod";

export const billItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive."),
  rate: z.coerce.number().min(0, "Rate must be non-negative."),
});

export const billFormSchema = z.object({
  sellerName: z.string().min(1, "Seller name is required.").default("J M K Trading"),
  sellerAddress: z.string().min(1, "Seller address is required.").default("123 Market St, Anytown"),
  sellerShopNumber: z.string().optional(),
  sellerOwnerNumber: z.string().optional(),
  clientName: z.string().min(1, "Client name is required."),
  clientAddress: z.string().min(1, "Client address is required."),
  billNumber: z.string().min(1, "Bill number is required."),
  date: z.date(),
  items: z.array(billItemSchema).min(1, "Please add at least one item."),
  discount: z.coerce.number().min(0, "Discount cannot be negative.").max(100, "Discount cannot exceed 100%.").default(0).optional(),
});

export type BillFormValues = z.infer<typeof billFormSchema>;
