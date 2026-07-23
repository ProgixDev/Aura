'use client';
import { useState } from 'react';
import { useUI } from '@/lib/store';
import { contactPublic } from '@/lib/contact';
import { errorMessage } from '@/lib/api';

const SUBJECTS = ['Question générale', 'Réservation', 'Paiement', 'Praticiens', 'Presse', 'Autre'];

export function ContactForm() {
  const toast = useUI((s) => s.toast);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await contactPublic({ name, email, subject, message });
      toast('Message envoyé — nous revenons vers vous sous 24h.', 'success');
      setName(''); setEmail(''); setSubject(SUBJECTS[0]); setMessage('');
    } catch (err) {
      toast(errorMessage(err), 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="field"><label>Votre nom</label><input className="input" placeholder="Camille Dupont" required value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field" style={{ marginTop: 14 }}><label>Votre email</label><input className="input" type="email" placeholder="vous@email.fr" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="field" style={{ marginTop: 14 }}>
        <label>Sujet</label>
        <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="field" style={{ marginTop: 14 }}><label>Votre message</label><textarea className="input" rows={5} placeholder="Dites-nous tout…" required value={message} onChange={(e) => setMessage(e.target.value)} /></div>

      <div className="mt-3">
        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
          {submitting ? 'Envoi…' : 'Envoyer le message'}
        </button>
      </div>
      <p className="tiny muted center mt-2">En envoyant, vous acceptez notre politique de confidentialité.</p>
    </form>
  );
}

export default ContactForm;
