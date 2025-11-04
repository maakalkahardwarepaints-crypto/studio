
import { z } from "zod";

export const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Client name is required."),
  address: z.string().min(1, "Client address is required."),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
});

export type Client = z.infer<typeof clientSchema>;


export const billItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive."),
  rate: z.coerce.number().min(0, "Rate must be non-negative."),
  cost: z.coerce.number().min(0, "Cost must be non-negative."),
});

export const billFormSchema = z.object({
  sellerName: z.string().min(1, "Seller name is required.").default("JMK Trading"),
  sellerAddress: z.string().min(1, "Seller address is required.").default("Shop No 3-4, Pliot No -1,Kh. No.796,Asola Bandh Road, Fatehpur Beri,New Delhi -110074"),
  sellerShopNumber: z.string().optional().default("011-41079296"),
  sellerOwnerNumber: z.string().optional().default("7479633348"),
  clientName: z.string().min(1, "Client name is required."),
  clientAddress: z.string().min(1, "Client address is required."),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email("Invalid email address.").optional().or(z.literal('')),
  billNumber: z.string().min(1, "Bill number is required."),
  date: z.date(),
  items: z.array(billItemSchema).min(1, "Please add at least one item."),
  discount: z.coerce.number().min(0, "Discount cannot be negative.").max(100, "Discount cannot exceed 100%.").default(0).optional(),
  currency: z.string().default("₹"),
});

export type BillFormValues = z.infer<typeof billFormSchema>;
