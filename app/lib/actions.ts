"use server";
import { z } from "zod";
import { sql } from "./db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { stat } from "fs";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer",
  }),
  amount: z.coerce.number().gt(0, {
    message: "Please enter a number greater than £0",
  }),
  date: z.string(),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status",
  }),
});

const CreateInvoice = FormSchema.omit({
  id: true,
  date: true,
});

const UpdateInvoice = FormSchema.omit({
  id: true,
  date: true,
});

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

// ---------- FUNCTIONS ----------

export async function createInvoice(prevState: State, formdata: FormData) {
  const validatedInput = CreateInvoice.safeParse({
    customerId: formdata.get("customerId"),
    amount: formdata.get("amount"),
    status: formdata.get("status"),
  });

  if (!validatedInput.success) {
    return {
      message: "Missing Fields. Failed to Create Invoice.",
      errors: validatedInput.error.flatten().fieldErrors,
    } satisfies State;
  }

  const { customerId, amount, status } = validatedInput.data;

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    return {
      message: "Database Error: Failed to Create Invoice.",
    };
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function updateInvoice(
  id: string,
  prevState: State,
  formdata: FormData
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formdata.get("customerId"),
    amount: formdata.get("amount"),
    status: formdata.get("status"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Invoice.",
    } satisfies State;
  }

  const { customerId, amount, status } = validatedFields.data;

  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET
        customer_id = ${customerId},
        amount = ${amountInCents},
        status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error(error);
  }

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id=${id}`;
  revalidatePath("/dashboard/invoices");
}

// ----------- AUTHENTICATIONS ---------
export async function authenticate(
  prevState: string | undefined,
  formdata: FormData
) {
  try {
    await signIn("credentials", formdata);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid Credentials";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
