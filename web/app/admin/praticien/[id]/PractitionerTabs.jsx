'use client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { Tabs } from '@/components/ui/Tabs';
import { ModalButton } from '@/components/ui/ModalButton';
import { api, apiFetchBlob } from '@/lib/api';
import { useUI } from '@/lib/store';
import { euro, dateFr } from '@/lib/format';

// rendez_vous.statut is French: en_attente|confirme|annule|termine.
const STATUT_LABEL = { en_attente: 'En attente', confirme: 'Confirmée', termine: 'Terminée', annule: 'Annulée' };
const STATUT_TONE = { en_attente: 'warning', confirme: 'success', termine: 'neutral', annule: 'danger' };
// praticien_documents.statut vocab (per-document verification status).
const DOC_TONE = { valide: 'success', en_attente: 'warning', rejete: 'danger', manquant: 'danger' };

async function openDocument(doc, toast) {
  try {
    const blob = await apiFetchBlob(`/v1/admin/praticiens/verification/documents/${doc.id}/file`);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    toast(err.message || "Impossible d'ouvrir le document", 'danger');
  }
}

export default function PractitionerTabs({ p, myBookings, myReviews }) {
  const toast = useUI((s) => s.toast);
  // Real per-type documents (label, soumis, statut, nom_fichier, id) — replaces the
  // hardcoded DOCS array. Same admin verification `show` endpoint the document
  // open/view flow on admin/praticiens/verification uses.
  const { data: verifRes } = useQuery({
    queryKey: ['admin', 'praticiens', 'verification', p.id],
    queryFn: () => api.get(`/v1/admin/praticiens/verification/${p.id}`),
  });
  const documents = verifRes?.data?.documents ?? {};
  const docEntries = Object.entries(documents);
  const submittedCount = docEntries.filter(([, d]) => d.soumis).length;

  const name = `${p.firstname} ${p.lastname}`;

  return (
    <Tabs tabs={[
      { key: 'infos', label: 'Informations' },
      { key: 'documents', label: `Documents (${submittedCount}/${docEntries.length || 5})` },
      { key: 'bookings', label: `Réservations (${myBookings.length})` },
      { key: 'reviews', label: `Avis (${myReviews.length})` },
    ]}>
      {(active) => {
        if (active === 'infos') {
          return (
            <div className="grid grid-2">
              <div className="card card-pad">
                <h3 className="h-4" style={{ marginBottom: 14 }}>Coordonnées</h3>
                <dl className="dl">
                  <dt>Email</dt><dd>{p.email}</dd>
                  <dt>SIRET</dt><dd>{p.siret}</dd>
                  <dt>Téléphone</dt><dd>{p.telephone}</dd>
                  <dt>Ville</dt><dd>{p.ville}</dd>
                  <dt>Inscrit le</dt><dd>{dateFr(p.date_inscription || p.created_at)}</dd>
                </dl>
              </div>
              <div className="card card-pad">
                <h3 className="h-4" style={{ marginBottom: 14 }}>Pratique</h3>
                <dl className="dl">
                  <dt>Niveau</dt><dd>{p.niveau}</dd>
                  <dt>Mode</dt><dd>{p.mode}</dd>
                  <dt>Tarif</dt><dd>{euro(p.tarif)} / séance</dd>
                  <dt>Expérience</dt><dd>{p.experience} ans · {myBookings.length} réservation{myBookings.length > 1 ? 's' : ''}</dd>
                  <dt>Spécialité</dt><dd>{p.specialite}</dd>
                </dl>
                {p.motif_rejet && (
                  <>
                    <div className="divider" />
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Motif de rejet</div>
                    <p className="small italic">{p.motif_rejet}</p>
                  </>
                )}
              </div>
            </div>
          );
        }
        if (active === 'documents') {
          return (
            <div className="card card-pad">
              <h3 className="h-4" style={{ marginBottom: 16 }}>Pièces justificatives</h3>
              <div className="stack gap-3">
                {docEntries.length === 0 ? (
                  <p className="small muted">Chargement des documents…</p>
                ) : docEntries.map(([type, doc]) => {
                  const ok = doc.statut === 'valide';
                  return (
                    <div key={type} className="row gap-3 between">
                      <span className="row gap-3">
                        <span className="tile-icon glyph-sage"><Icon name={doc.soumis ? (ok ? 'checkCircle' : 'clock') : 'x'} size={16} color={ok ? 'var(--sage-2)' : doc.soumis ? 'var(--gold-2)' : 'var(--danger)'} /></span>
                        <span><div style={{ fontWeight: 500 }}>{doc.label}</div><div className="tiny">{doc.nom_fichier || 'Non soumis'}</div></span>
                      </span>
                      <div className="row gap-2">
                        <Badge variant={DOC_TONE[doc.statut] || 'neutral'} dot>{doc.statut}</Badge>
                        {doc.soumis && <button className="btn btn-link btn-sm" onClick={() => openDocument(doc, toast)}>Voir</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="divider" />
              <div className="row gap-2 wrap">
                <ModalButton modal="verifyPractitioner" payload={{ name }} successToast="Vérification confirmée" className="btn btn-soft btn-sm"><Icon name="check" size={15} /> Re-valider</ModalButton>
                <ModalButton modal="addNote" payload={{ name }} successToast="Note enregistrée" className="btn btn-soft btn-sm"><Icon name="edit" size={15} /> Ajouter une note</ModalButton>
              </div>
            </div>
          );
        }
        if (active === 'bookings') {
          return (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="table">
                <thead><tr><th>Réf.</th><th>Client</th><th>Date</th><th>Mode</th><th>Montant</th><th>Statut</th></tr></thead>
                <tbody>
                  {myBookings.length === 0 ? (
                    <tr><td colSpan={6}><div className="empty"><div className="glyph">❍</div>Aucune réservation</div></td></tr>
                  ) : myBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="table-cell-main">RDV-{b.id}</td>
                      <td>{b.client ? `${b.client.firstname} ${b.client.lastname}` : '—'}</td>
                      <td className="small">{dateFr(b.date_heure)}</td>
                      <td className="small">{b.mode}</td>
                      <td>{euro(b.tarif)}</td>
                      <td><Badge variant={STATUT_TONE[b.statut] || 'neutral'}>{STATUT_LABEL[b.statut] || b.statut}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        // reviews — /avis?praticien_id= only ever returns published avis, so there is
        // no per-review status left to show or moderate here (that queue lives on
        // admin/avis).
        return (
          <div className="stack gap-4">
            {myReviews.length === 0 ? (
              <div className="empty"><div className="glyph">❍</div>Aucun avis pour le moment</div>
            ) : myReviews.map((r) => (
              <div key={r.id} className="card card-pad">
                <div className="between" style={{ marginBottom: 8 }}>
                  <strong>{r.full_name_author}</strong>
                  <Rating value={r.note} size={13} showCount={false} />
                </div>
                <p className="small">{r.avis}</p>
                <div className="tiny" style={{ marginTop: 10 }}>{dateFr(r.date_ajout)}</div>
              </div>
            ))}
          </div>
        );
      }}
    </Tabs>
  );
}
