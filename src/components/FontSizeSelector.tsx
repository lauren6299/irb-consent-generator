import { useFontSize, FontSize } from '@/hooks/useFontSize';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const options: { label: string; value: FontSize }[] = [
  { label: 'A−', value: 'small' },
  { label: 'A', value: 'medium' },
  { label: 'A+', value: 'large' },
];

export default function FontSizeSelector() {
  const { fontSize, setFontSize } = useFontSize();

  return (
    <div className="flex items-center border rounded-md overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setFontSize(opt.value)}
          className={cn(
            'px-2 py-1 text-xs font-medium transition-colors',
            fontSize === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:bg-accent'
          )}
          title={`${opt.value.charAt(0).toUpperCase() + opt.value.slice(1)} font size`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
