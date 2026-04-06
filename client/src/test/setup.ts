import '@testing-library/jest-dom/vitest';

// Board.tsx uses window.innerWidth for piece sizing.
Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 800 });

// MoveHistory uses scrollIntoView on a ref.
Element.prototype.scrollIntoView = () => {};
