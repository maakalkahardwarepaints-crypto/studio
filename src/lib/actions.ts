"use server";

import { generateBillSummary } from "@/ai/flows/generate-bill-summary";
import { billFormSchema, type BillFormValues } from "@/lib/schemas";

export async function getBillSummaryAction(
  data: BillFormValues
): Promise<{ summary: string } | { error: string }> {
  const validation = billFormSchema.safeParse(data);
  if (!validation.success) {
    return { error: "Invalid form data." };
  }

  const billData = validation.data;

  try {
    const totalAmount = billData.items.reduce(
      (acc, item) => acc + item.quantity * item.rate,
      0
    );

    const summaryInput = {
      sellerName: billData.sellerName,
      clientName: billData.clientName,
      billNumber: billData.billNumber,
      date: billData.date.toLocaleDateString(),
      totalAmount,
      items: billData.items.map((item) => ({
        ...item,
        amount: item.quantity * item.rate,
      })),
    };

    const result = await generateBillSummary(summaryInput);
    return { summary: result.summary };
  } catch (e) {
    console.error(e);
    return { error: "Failed to generate summary. Please try again." };
  }
}
