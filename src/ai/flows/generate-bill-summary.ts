'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a short summary of a bill.
 *
 * - generateBillSummary - A function that takes bill details as input and returns a concise summary.
 * - GenerateBillSummaryInput - The input type for the generateBillSummary function.
 * - GenerateBillSummaryOutput - The return type for the generateBillSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBillSummaryInputSchema = z.object({
  sellerName: z.string().describe('The name of the seller.'),
  clientName: z.string().describe('The name of the client.'),
  billNumber: z.string().describe('The bill number.'),
  date: z.string().describe('The date of the bill.'),
  totalAmount: z.number().describe('The total amount of the bill.'),
  items: z
    .array(
      z.object({
        itemName: z.string(),
        quantity: z.number(),
        rate: z.number(),
        amount: z.number(),
      })
    )
    .describe('An array of items in the bill.'),
});
export type GenerateBillSummaryInput = z.infer<typeof GenerateBillSummaryInputSchema>;

const GenerateBillSummaryOutputSchema = z.object({
  summary: z.string().describe('A short, concise summary of the bill.'),
});
export type GenerateBillSummaryOutput = z.infer<typeof GenerateBillSummaryOutputSchema>;

export async function generateBillSummary(input: GenerateBillSummaryInput): Promise<GenerateBillSummaryOutput> {
  return generateBillSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBillSummaryPrompt',
  input: {schema: GenerateBillSummaryInputSchema},
  output: {schema: GenerateBillSummaryOutputSchema},
  prompt: `You are an accounting expert specializing in summarizing bills for small businesses.

  Given the following bill details, generate a short, concise summary of the bill.

  Seller Name: {{{sellerName}}}
  Client Name: {{{clientName}}}
  Bill Number: {{{billNumber}}}
  Date: {{{date}}}
  Total Amount: {{{totalAmount}}}
  Items: {{#each items}}{{{itemName}}} (Qty: {{{quantity}}}, Rate: {{{rate}}}, Amount: {{{amount}}}) {{/each}}
  `,
});

const generateBillSummaryFlow = ai.defineFlow(
  {
    name: 'generateBillSummaryFlow',
    inputSchema: GenerateBillSummaryInputSchema,
    outputSchema: GenerateBillSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
