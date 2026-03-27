import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should display the main container', () => {
    render(<App />);
    const container = screen.getByRole('main');
    expect(container).toBeInTheDocument();
  });
});
