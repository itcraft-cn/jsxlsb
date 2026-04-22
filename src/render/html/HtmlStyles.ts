export const defaultStyles = {
  table: {
    'border-collapse': 'collapse',
    'width': '100%',
    'font-family': 'Arial, sans-serif',
    'font-size': '12px'
  },
  header: {
    'background-color': '#f0f0f0',
    'font-weight': 'bold',
    'border': '1px solid #d0d0d0',
    'padding': '4px 8px',
    'text-align': 'center'
  },
  cell: {
    'border': '1px solid #d0d0d0',
    'padding': '4px 8px',
    'text-align': 'left'
  },
  numberCell: {
    'text-align': 'right'
  },
  darkTheme: {
    table: {
      'background-color': '#1a1a1a',
      'color': '#ffffff'
    },
    header: {
      'background-color': '#2a2a2a',
      'border': '1px solid #404040'
    },
    cell: {
      'border': '1px solid #404040'
    }
  }
};

export function applyStyles(element: HTMLElement, styles: Record<string, string>): void {
  for (const [key, value] of Object.entries(styles)) {
    element.style[key as any] = value;
  }
}