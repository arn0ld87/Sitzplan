import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState icon={Users} title="Leer" description="Noch nichts hier." />);
    expect(screen.getByText('Leer')).toBeInTheDocument();
    expect(screen.getByText('Noch nichts hier.')).toBeInTheDocument();
  });

  it('omits description when not provided', () => {
    render(<EmptyState icon={Users} title="Leer" />);
    expect(screen.getByText('Leer')).toBeInTheDocument();
    expect(screen.queryByRole('paragraph')).toBeNull();
  });

  it('renders action button and calls onClick', () => {
    const onClick = vi.fn();
    render(<EmptyState icon={Users} title="Leer" action={{ label: 'Beispiel laden', onClick }} />);
    const btn = screen.getByRole('button', { name: 'Beispiel laden' });
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('omits action button when not provided', () => {
    render(<EmptyState icon={Users} title="Leer" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uses role=status for screen-reader announcement', () => {
    render(<EmptyState icon={Users} title="Leer" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
