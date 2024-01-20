'use server';

import { sql } from '@vercel/postgres';
import { signIn } from 'next-auth/react';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { AuthError } from 'next-auth'

const formSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string()
})

const CreateInvoice = formSchema.omit({ id: true, date: true });

 
export async function createInvoice(formData: FormData) {
  // console.log('Creating invoice...');
  // console.log('Form data:', formData);

  // const rawFormData = Object.fromEntries(formData.entries());
  // console.log('Data from form:', rawFormData);

  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  console.log('Parsed data:', { customerId, amount, status });

  const amountInCent = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`INSERT INTO invoices (customer_id, amount, status, date) VALUES (${customerId}, ${amountInCent}, ${status}, ${date})`;
  } catch (error) {
    console.error('Database Error:', error);
    // throw new Error('Failed to create invoice');
    return {
      message: 'Failed to create invoice'
    }
  }


  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

const UpdateInvoice = formSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  try {
    await sql`UPDATE invoices SET customer_id=${customerId}, amount=${amountInCents}, status=${status} WHERE id=${id}`;
  } catch (error) {
    console.error('Database Error:', error);
    // throw new Error('Failed to update invoice');
    return {
      message: 'Failed to update invoice'
    }
  }


  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');

}

export async function deleteInvoice(id: string) {
  throw new Error('Failed to Delete Invoice');
  try {
    await sql`DELETE FROM invoices WHERE id=${id}`;
    revalidatePath('/dashboard/invoices');
    return {
      message: 'Invoice deleted.'
    }
  } catch (error) {
    console.error('Database Error:', error);
    // throw new Error('Failed to delete invoice');
    return {
      message: 'Failed to delete invoice'
    }
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if  (error instanceof Error) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials';
        default:
          return 'Something went wrong. Please try again.';
      }
    }
    throw error;
  }
}