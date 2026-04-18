import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (val: number) => void;
  readonly?: boolean;
  size?: number;
}

export function StarRating({ value, onChange, readonly = false, size = 16 }: StarRatingProps) {
  return (
    <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= value ? '#fbbf24' : 'transparent'}
          color={star <= value ? '#fbbf24' : 'var(--text-secondary)'}
          style={{
            cursor: readonly ? 'default' : 'pointer',
            opacity: star <= value ? 1 : 0.3,
            transition: 'all 0.2s ease',
          }}
          onClick={() => !readonly && onChange && onChange(star)}
        />
      ))}
    </div>
  );
}
