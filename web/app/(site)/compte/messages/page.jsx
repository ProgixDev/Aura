import MessagesList from './MessagesList';

export const metadata = { title: 'Messages — GUÉRIENERGIES' };

export default function MessagesPage() {
  return (
    <div className="stack gap-5">
      <header className="reveal r-1">
        <h1 className="h-1">Messages</h1>
        <p className="lead" style={{ marginTop: 4 }}>Échangez avec vos praticiens, <span className="serif italic accent">en toute sérénité</span>.</p>
      </header>

      <MessagesList />
    </div>
  );
}
