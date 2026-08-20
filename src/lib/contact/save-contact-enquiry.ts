// Zapisuje zgłoszenie z formularza kontaktowego jako zapytanie przez API GraphQL

import type { ContactSubmission } from "./send-contact-email";

const ENDPOINT = process.env.GRAPHQL_INTERNAL_URL ?? "http://localhost:4000/graphql";

const ADD_ENQUIRY_MUTATION = `
  mutation AddEnquiry($name: String!, $email: String, $phone: String, $note: String, $source: String) {
    addEnquiry(name: $name, email: $email, phone: $phone, note: $note, source: $source) {
      id
    }
  }
`;

export async function saveContactEnquiry(submission: ContactSubmission): Promise<void> {
  const { name, email, phone, company, message } = submission;
  const note = company ? `Company: ${company}\n\n${message}` : message;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: ADD_ENQUIRY_MUTATION,
      variables: { name, email, phone, note, source: "website_contact_form" },
    }),
  });

  const json = (await res.json()) as { errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors[0]!.message);
  }
}
