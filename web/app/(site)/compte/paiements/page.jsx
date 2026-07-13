import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { transactions } from '@/lib/data/admin';
import { dateFr, euro, tone } from '@/lib/format';

export const metadata = { title: 'Paiements — AURA' };

const CARDS = [
  { id: 'cd1', brand: 'Visa', last4: '4242', exp: '08 / 27', tint: 'glyph-violet', primary: true },
  { id: 'cd2', brand: 'Mastercard', last4: '8810', exp: '02 / 26', tint: 'glyph-sky', primary: false },
];

const ADD_CARD_FIELDS = [
  { name: 'number', label: 'Numéro de carte', type: 'text', required: true },
  { name: 'exp', label: "Date d'expiration", type: 'text', required: true },
  { name: 'cvc', label: 'CVC', type: 'text', required: true },
  { name: 'name', label: 'Nom sur la carte', type: 'text', required: true },
];

const STATUS_FR = { paid: 'Payé', refunded: 'Remboursé', processing: 'En cours' };

export default function PaiementsPage() {
  const history = transactions.slice(0, 8);

  return (
    <div className="stack gap-6">
      <header className="reveal r-1">
        <h1 className="h-1">Paiements</h1>
        <p className="lead" style={{ marginTop: 4 }}>Vos moyens de paiement et votre <span className="serif italic accent">historique</span>.</p>
      </header>

      {/* Cartes */}
      <section className="reveal r-2">
        <div className="section-head"><h2 className="h-3">Moyens de paiement</h2></div>
        <div className="grid grid-2">
          {CARDS.map((c) => (
            <div key={c.id} className="card card-pad">
              <div className="row gap-3 between" style={{ alignItems: 'flex-start' }}>
                <div className="row gap-3">
                  <span className={`tile-icon ${c.tint}`}><Icon name="card" size={18} /></span>
                  <div>
                    <div className="row gap-2"><span className="h-4" style={{ fontWeight: 500 }}>{c.brand} ···· {c.last4}</span>{c.primary && <Badge variant="info">Par défaut</Badge>}</div>
                    <div className="small">Expire {c.exp}</div>
                  </div>
                </div>
                <ModalButton modal="deleteItem" payload={{ title: 'Supprimer la carte', message: `Supprimer la carte ${c.brand} ···· ${c.last4} ?`, confirmLabel: 'Supprimer', danger: true, successToast: 'Carte supprimée' }} className="btn btn-icon btn-ghost" title="Supprimer"><Icon name="trash" size={16} /></ModalButton>
              </div>
            </div>
          ))}
          <ModalButton modal="form" payload={{ title: 'Ajouter une carte', fields: ADD_CARD_FIELDS, submitLabel: 'Ajouter', successToast: 'Carte ajoutée' }} className="card card-pad card-hover" as="div" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', color: 'var(--violet-2)', minHeight: 92 }}>
            <Icon name="plus" size={18} color="var(--violet-2)" /> <span style={{ fontWeight: 500 }}>Ajouter une carte</span>
          </ModalButton>
        </div>
      </section>

      {/* Historique */}
      <section className="reveal r-3">
        <div className="section-head"><h2 className="h-3">Historique des transactions</h2><ToastButton message="Export CSV téléchargé" className="btn btn-soft btn-sm"><Icon name="download" size={14} /> Exporter</ToastButton></div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Référence</th><th>Date</th><th>Praticien</th><th>Montant</th><th>Moyen</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {history.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.ref}</td>
                  <td>{dateFr(t.date)}</td>
                  <td>{t.practitionerName}</td>
                  <td className="price" style={{ fontSize: 15 }}>{euro(t.gross)}</td>
                  <td>{t.method}</td>
                  <td><Badge variant={tone(t.status)}>{STATUS_FR[t.status] || t.status}</Badge></td>
                  <td><ToastButton message={`Facture ${t.ref} téléchargée`} className="btn btn-icon btn-ghost" title="Facture"><Icon name="download" size={15} /></ToastButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="note"><Icon name="shield" size={15} color="var(--violet-2)" /> Vos paiements sont sécurisés et chiffrés. AURA ne conserve jamais vos données bancaires complètes.</div>
    </div>
  );
}
