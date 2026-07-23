import { api } from './api';

// Sends a real email (server-side SMTP) to a praticien or client, reply-to the
// current admin — see server/src/admin-contact. This is the onSubmit every
// admin-facing `ModalButton modal="contact"` payload wires in, so the modal
// actually sends something instead of just showing a fake success toast.
export function contactRecipient(type, id, { subject, message }) {
  return api.post('/admin/contact', { recipient_type: type, recipient_id: id, subject, message });
}

// Anonymous/public "contact us" — no logged-in identity, so the form itself
// collects who's asking (name/email) and where to send it: the platform's own
// inbox (see server/src/contact). This is the registry's default onSubmit for
// modal="contact" whenever a call site doesn't already pass its own (admin
// pages do; so does anything using real in-app messaging instead of email).
export function contactPublic({ name, email, subject, message }) {
  return api.post('/contact', { name, email, subject, message });
}
