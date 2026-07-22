'use client';
// Modal registry — maps a modal `name` to a render(props) function.
// Pages call: openModal('<name>', props). Many named entries are thin presets
// over the generic ConfirmModal / FormModal so there is a large, distinct
// vocabulary of working modals across the app.
import { ConfirmModal } from './ConfirmModal';
import { FormModal } from './FormModal';
import { ShareModal } from './ShareModal';
import { LightboxModal } from './LightboxModal';
import { AuthModal } from './AuthModal';
import { FiltersModal } from './FiltersModal';

export const MODAL_REGISTRY = {
  // ---- generic primitives ----
  confirm: (p) => <ConfirmModal {...p} />,
  form: (p) => <FormModal {...p} />,
  share: (p) => <ShareModal {...p} />,
  lightbox: (p) => <LightboxModal {...p} />,
  auth: (p) => <AuthModal {...p} />,
  filters: (p) => <FiltersModal {...p} />,

  // ---- public / client modals ----
  login: (p) => <AuthModal mode="login" {...p} />,
  signup: (p) => <AuthModal mode="signup" {...p} />,
  forgot: (p) => <AuthModal mode="forgot" {...p} />,
  contact: (p) => <FormModal title={`Contacter ${p?.name || 'le praticien'}`} subtitle="Posez vos questions avant la séance. Aucun paiement en privé."
    fields={[{ name: 'subject', label: 'Objet', type: 'select', options: ['Première prise de contact', 'Question sur une séance', 'Disponibilités', 'Autre'], required: true }, { name: 'message', label: 'Votre message', type: 'textarea', placeholder: 'Bonjour…', required: true }]}
    submitLabel="Envoyer le message" successToast="Message envoyé" {...p} />,
  report: (p) => <FormModal title="Signaler" subtitle="Aidez-nous à garder GuériEnergies sûr et bienveillant." danger
    fields={[{ name: 'reason', label: 'Motif', type: 'select', options: ['Contenu inapproprié', 'Comportement déplacé', 'Fausse information', 'Tentative de paiement hors plateforme', 'Autre'], required: true }, { name: 'details', label: 'Détails', type: 'textarea', placeholder: 'Décrivez la situation…' }]}
    submitLabel="Envoyer le signalement" successToast="Signalement transmis à la modération" {...p} />,
  review: (p) => <FormModal title="Laisser un avis" subtitle={p?.name ? `Votre expérience avec ${p.name}` : undefined}
    fields={[{ name: 'rating', label: 'Note', type: 'rating' }, { name: 'text', label: 'Votre avis', type: 'textarea', placeholder: 'Partagez votre ressenti…', required: true }]}
    submitLabel="Publier l'avis" successToast="Merci, votre avis sera publié après vérification" {...p} />,
  gift: (p) => <FormModal title="Offrir une carte cadeau" subtitle="Un soin à offrir, sans date d'expiration."
    fields={[{ name: 'amount', label: 'Montant', type: 'select', options: ['50 €', '75 €', '100 €', '150 €'], required: true }, { name: 'to', label: 'Destinataire', type: 'text', placeholder: 'Prénom' }, { name: 'email', label: 'Email du destinataire', type: 'email' }, { name: 'note', label: 'Petit mot', type: 'textarea' }]}
    submitLabel="Payer et offrir" successToast="Carte cadeau envoyée" {...p} />,
  newsletter: (p) => <FormModal title="Rester informé" subtitle="Une lettre douce, une fois par mois."
    fields={[{ name: 'email', label: 'Email', type: 'email', placeholder: 'vous@exemple.fr', required: true }]}
    submitLabel="S'abonner" successToast="Inscription confirmée" {...p} />,
  cancelBooking: (p) => <ConfirmModal title="Annuler la réservation" message="Annulation gratuite jusqu'à 24h avant la séance. Au-delà, des frais peuvent s'appliquer." danger confirmLabel="Annuler la séance" cancelLabel="Garder" successToast="Réservation annulée" {...p} />,
  reschedule: (p) => <FormModal title="Reprogrammer" subtitle="Proposez un nouveau créneau."
    fields={[{ name: 'date', label: 'Nouvelle date', type: 'text', placeholder: 'jeu. 12 juin' }, { name: 'slot', label: 'Créneau', type: 'select', options: ['10h00', '14h00', '16h30', '18h00'] }]}
    submitLabel="Proposer le créneau" successToast="Demande de report envoyée" {...p} />,

  // ---- admin modals ----
  verifyPractitioner: (p) => <ConfirmModal title="Vérifier le praticien" message="Confirmer que les documents (SIRET, diplômes, identité) sont conformes ? Le badge « Vérifiée » sera attribué." confirmLabel="Vérifier" successToast="Praticien vérifié" {...p} />,
  rejectPractitioner: (p) => <ConfirmModal title="Rejeter la candidature" danger withReason reasonLabel="Motif du rejet" message="Le praticien sera notifié du refus." confirmLabel="Rejeter" successToast="Candidature rejetée" {...p} />,
  suspendUser: (p) => <ConfirmModal title="Suspendre le compte" danger withReason reasonLabel="Motif de la suspension" message="L'accès sera bloqué jusqu'à réactivation." confirmLabel="Suspendre" successToast="Compte suspendu" {...p} />,
  banUser: (p) => <ConfirmModal title="Bannir définitivement" danger withReason message="Cette action est irréversible." confirmLabel="Bannir" successToast="Compte banni" {...p} />,
  deleteItem: (p) => <ConfirmModal title="Supprimer" danger message="Cet élément sera définitivement supprimé." confirmLabel="Supprimer" successToast="Supprimé" {...p} />,
  refund: (p) => <FormModal title="Rembourser" subtitle={p?.amount ? `Transaction de ${p.amount}` : undefined} danger
    fields={[{ name: 'type', label: 'Type', type: 'select', options: ['Remboursement total', 'Remboursement partiel'], required: true }, { name: 'amount', label: 'Montant (€)', type: 'number', placeholder: '75' }, { name: 'reason', label: 'Motif', type: 'textarea' }]}
    submitLabel="Émettre le remboursement" successToast="Remboursement émis" {...p} />,
  payout: (p) => <FormModal title="Verser le praticien" fields={[{ name: 'amount', label: 'Montant (€)', type: 'number', required: true }, { name: 'method', label: 'Méthode', type: 'select', options: ['Virement SEPA', 'Stripe Connect'] }]}
    submitLabel="Programmer le virement" successToast="Virement programmé" {...p} />,
  resolveReport: (p) => <FormModal title="Traiter le signalement"
    fields={[{ name: 'action', label: 'Décision', type: 'select', options: ['Aucune action', 'Avertissement', 'Masquer le contenu', 'Suspendre le compte'], required: true }, { name: 'note', label: 'Note interne', type: 'textarea' }]}
    submitLabel="Clôturer" successToast="Signalement traité" {...p} />,
  resolveDispute: (p) => <FormModal title="Résoudre le litige"
    fields={[{ name: 'decision', label: 'En faveur de', type: 'select', options: ['Client (remboursement)', 'Praticien (séance due)', 'Compromis 50/50'], required: true }, { name: 'note', label: 'Motivation', type: 'textarea' }]}
    submitLabel="Trancher" successToast="Litige résolu" {...p} />,
  moderateReview: (p) => <FormModal title="Modérer l'avis"
    fields={[{ name: 'action', label: 'Action', type: 'select', options: ['Publier', 'Masquer', 'Supprimer'], required: true }, { name: 'note', label: 'Raison', type: 'textarea' }]}
    submitLabel="Appliquer" successToast="Avis modéré" {...p} />,
  addNote: (p) => <FormModal title="Ajouter une note" fields={[{ name: 'note', label: 'Note interne', type: 'textarea', required: true }]} submitLabel="Enregistrer" successToast="Note ajoutée" {...p} />,
  changeStatus: (p) => <FormModal title="Changer le statut" fields={[{ name: 'status', label: 'Statut', type: 'select', options: p?.options || ['Actif', 'En attente', 'Suspendu'], required: true }]} submitLabel="Mettre à jour" successToast="Statut mis à jour" {...p} />,
  sendNotification: (p) => <FormModal title="Envoyer une notification" size="modal-lg"
    fields={[{ name: 'audience', label: 'Audience', type: 'select', options: ['Tous les utilisateurs', 'Praticiens', 'Clients', 'Segment personnalisé'], required: true }, { name: 'channel', label: 'Canal', type: 'select', options: ['Push', 'Email', 'In-app'] }, { name: 'title', label: 'Titre', type: 'text', required: true }, { name: 'body', label: 'Message', type: 'textarea', required: true }]}
    submitLabel="Envoyer" successToast="Notification envoyée" {...p} />,
  createPromo: (p) => <FormModal title="Nouveau code promo"
    fields={[{ name: 'code', label: 'Code', type: 'text', placeholder: 'EQUINOXE25', required: true }, { name: 'type', label: 'Type', type: 'select', options: ['Pourcentage', 'Montant fixe'] }, { name: 'value', label: 'Valeur', type: 'text', placeholder: '25% ou 15 €' }, { name: 'expiry', label: 'Expiration', type: 'text', placeholder: '30 juin 2026' }]}
    submitLabel="Créer le code" successToast="Code promo créé" {...p} />,
  invite: (p) => <FormModal title="Inviter un membre"
    fields={[{ name: 'email', label: 'Email', type: 'email', required: true }, { name: 'role', label: 'Rôle', type: 'select', options: ['Administrateur', 'Modérateur', 'Support', 'Comptabilité'], required: true }]}
    submitLabel="Envoyer l'invitation" successToast="Invitation envoyée" {...p} />,
  exportData: (p) => <FormModal title="Exporter" fields={[{ name: 'format', label: 'Format', type: 'select', options: ['CSV', 'Excel (.xlsx)', 'PDF'], required: true }, { name: 'range', label: 'Période', type: 'select', options: ['30 derniers jours', 'Trimestre', 'Année', 'Tout'] }]} submitLabel="Générer l'export" successToast="Export généré" {...p} />,
  editField: (p) => <FormModal title={p?.title || 'Modifier'} fields={p?.fields || [{ name: 'value', label: 'Valeur', type: 'text' }]} submitLabel="Enregistrer" successToast="Modifié" {...p} />,
  approveEvent: (p) => <ConfirmModal title="Publier l'événement" message="L'événement sera visible publiquement." confirmLabel="Publier" successToast="Événement publié" {...p} />,
};
