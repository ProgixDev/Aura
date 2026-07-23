import { api } from './api';

// Sends a real email (server-side SMTP) to a praticien or client, reply-to the
// current admin — see server/src/admin-contact. This is the onSubmit every
// admin-facing `ModalButton modal="contact"` payload wires in, so the modal
// actually sends something instead of just showing a fake success toast.
export function contactRecipient(type, id, { subject, message }) {
  return api.post('/admin/contact', { recipient_type: type, recipient_id: id, subject, message });
}
