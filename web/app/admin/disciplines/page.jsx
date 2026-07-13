import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { disciplines } from '@/lib/data/disciplines';

export default function AdminDisciplinesPage() {
  const total = disciplines.reduce((s, d) => s + d.count, 0);

  return (
    <>
      <PageHead
        title="Disciplines"
        subtitle={`${disciplines.length} disciplines · ${total} praticiens référencés`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Disciplines' }]}
        actions={
          <ModalButton
            modal="editField"
            payload={{ title: 'Nouvelle discipline', fields: [
              { name: 'name', label: 'Nom', type: 'text', required: true },
              { name: 'slug', label: 'Slug', type: 'text', required: true },
              { name: 'tone', label: 'Tonalité', type: 'select', options: ['violet', 'sky', 'sage', 'gold'] },
              { name: 'glyph', label: 'Glyphe', type: 'text' },
              { name: 'tagline', label: 'Accroche', type: 'text' },
            ] }}
            className="btn btn-primary btn-sm"
          >
            <Icon name="plus" size={15} /> Ajouter une discipline
          </ModalButton>
        }
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Disciplines</div><div className="h-2" style={{ marginTop: 6 }}>{disciplines.length}</div><div className="small">catégories actives</div></div>
        <div className="card card-pad"><div className="eyebrow">Praticiens</div><div className="h-2" style={{ marginTop: 6 }}>{total}</div><div className="small">tous domaines confondus</div></div>
        <div className="card card-pad">
          <div className="eyebrow">La plus suivie</div>
          <div className="h-3" style={{ marginTop: 8 }}>{[...disciplines].sort((a, b) => b.count - a.count)[0].name}</div>
          <div className="small">{[...disciplines].sort((a, b) => b.count - a.count)[0].count} praticiens</div>
        </div>
      </div>

      <div className="grid grid-3">
        {disciplines.map((d) => (
          <div key={d.slug} className="card card-pad card-hover">
            <div className="between" style={{ alignItems: 'flex-start' }}>
              <div className={`tile-icon glyph-${d.tone}`} style={{ fontSize: 22 }}>{d.glyph}</div>
              <Badge variant="neutral">{d.count} praticiens</Badge>
            </div>
            <h3 className="h-3" style={{ marginTop: 14 }}>{d.name}</h3>
            <p className="small" style={{ marginTop: 6, minHeight: 38 }}>{d.tagline}</p>
            <div className="row gap-2" style={{ marginTop: 14 }}>
              <ModalButton
                modal="editField"
                payload={{ title: `Modifier « ${d.name} »`, fields: [
                  { name: 'name', label: 'Nom', type: 'text' },
                  { name: 'tone', label: 'Tonalité', type: 'select', options: ['violet', 'sky', 'sage', 'gold'] },
                  { name: 'tagline', label: 'Accroche', type: 'text' },
                  { name: 'intro', label: 'Introduction', type: 'textarea' },
                ] }}
                className="btn btn-soft btn-sm flex-1"
              >
                <Icon name="edit" size={14} /> Modifier
              </ModalButton>
              <ModalButton modal="deleteItem" payload={{ title: d.name }} className="btn btn-danger-soft btn-sm btn-icon" title="Supprimer">
                <Icon name="trash" size={14} />
              </ModalButton>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
