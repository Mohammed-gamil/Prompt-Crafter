/** Single colour-swatch circle button atom — used inside colour pickers. */

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onClick: () => void;
}

export default function ColorSwatch({ color, selected, onClick }: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
      style={{ backgroundColor: color, borderColor: selected ? '#fff' : 'transparent' }}
      title={color}
    />
  );
}
