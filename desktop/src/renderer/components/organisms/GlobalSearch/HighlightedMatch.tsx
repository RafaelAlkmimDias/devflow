interface HighlightedMatchProps {
  content: string;
  match: string;
}

export function HighlightedMatch({ content, match }: HighlightedMatchProps) {
  const idx = content.toLowerCase().indexOf(match.toLowerCase());
  if (idx === -1) {
    return <span>{content}</span>;
  }

  const before = content.slice(0, idx);
  const highlighted = content.slice(idx, idx + match.length);
  const after = content.slice(idx + match.length);

  return (
    <>
      <span>{before}</span>
      <span className="bg-yellow-500/30 text-yellow-200">{highlighted}</span>
      <span>{after}</span>
    </>
  );
}
