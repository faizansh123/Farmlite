/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#faf9f6', // Warm sand beige/off-white
        foreground: '#2d2d2d', // Dark charcoal
        card: '#ffffff',
        'card-foreground': '#2d2d2d',
        primary: '#22c55e', // Vibrant farm green
        'primary-foreground': '#ffffff',
        secondary: '#f5f3f0', // Light warm beige
        'secondary-foreground': '#2d2d2d',
        muted: '#f5f3f0', // Light warm beige
        'muted-foreground': '#6b6b6b',
        accent: '#eab308', // Muted yellow/gold
        'accent-foreground': '#2d2d2d',
        destructive: '#dc2626', // Soft red
        'destructive-foreground': '#ffffff',
        success: '#166534', // Dark green
        'success-foreground': '#ffffff',
        warning: '#eab308', // Muted yellow/gold
        'warning-foreground': '#2d2d2d',
        border: '#e5e3df', // Warm light border
      },
    },
  },
  plugins: [],
}

