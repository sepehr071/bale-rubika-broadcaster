import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
  	container: {
  		center: true,
  		padding: '1rem',
  		screens: {
  			'2xl': '960px'
  		}
  	},
  	extend: {
  		colors: {
  			bg: 'hsl(var(--bg) / <alpha-value>)',
  			surface: {
  				'1': 'hsl(var(--surface-1) / <alpha-value>)',
  				'2': 'hsl(var(--surface-2) / <alpha-value>)',
  				'3': 'hsl(var(--surface-3) / <alpha-value>)',
  				DEFAULT: 'hsl(var(--surface-1) / <alpha-value>)'
  			},
  			border: 'hsl(var(--border) / <alpha-value>)',
  			'border-strong': 'hsl(var(--border-strong) / <alpha-value>)',
  			ink: {
  				'2': 'hsl(var(--text-2) / <alpha-value>)',
  				DEFAULT: 'hsl(var(--text) / <alpha-value>)',
  				muted: 'hsl(var(--muted) / <alpha-value>)'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
  				strong: 'hsl(var(--accent-strong) / <alpha-value>)',
  				soft: 'hsl(var(--accent) / 0.12)'
  			},
  			ok: {
  				DEFAULT: 'hsl(var(--ok) / <alpha-value>)',
  				soft: 'hsl(var(--ok) / 0.14)'
  			},
  			warn: {
  				DEFAULT: 'hsl(var(--warn) / <alpha-value>)',
  				soft: 'hsl(var(--warn) / 0.14)'
  			},
  			danger: {
  				DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
  				soft: 'hsl(var(--danger) / 0.14)'
  			},
  			background: 'hsl(var(--bg) / <alpha-value>)',
  			foreground: 'hsl(var(--text) / <alpha-value>)',
  			card: {
  				DEFAULT: 'hsl(var(--surface-1) / <alpha-value>)',
  				foreground: 'hsl(var(--text) / <alpha-value>)'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--surface-1) / <alpha-value>)',
  				foreground: 'hsl(var(--text) / <alpha-value>)'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
  				foreground: 'hsl(0 0% 100% / <alpha-value>)'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--surface-2) / <alpha-value>)',
  				foreground: 'hsl(var(--text) / <alpha-value>)'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--surface-2) / <alpha-value>)',
  				foreground: 'hsl(var(--muted) / <alpha-value>)'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
  				foreground: 'hsl(0 0% 100% / <alpha-value>)'
  			},
  			input: 'hsl(var(--border) / <alpha-value>)',
  			ring: 'hsl(var(--accent) / <alpha-value>)'
  		},
  		fontFamily: {
  			sans: [
  				'Vazirmatn',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'"JetBrains Mono Variable"',
  				'ui-monospace',
  				'monospace'
  			]
  		},
  		fontSize: {
  			xs: ['12.5px', { lineHeight: '1.55' }],
  			sm: ['14px', { lineHeight: '1.6' }],
  			base: ['15px', { lineHeight: '1.7' }],
  			lg: ['18px', { lineHeight: '1.5' }],
  			xl: ['24px', { lineHeight: '1.35' }],
  			'2xl': ['30px', { lineHeight: '1.3' }],
  		},
  		borderRadius: {
  			lg: '12px',
  			md: '10px',
  			sm: '8px'
  		},
  		boxShadow: {
  			card: '0 1px 0 hsl(var(--border) / 0.6), 0 1px 2px hsl(258 30% 30% / 0.04)',
  			raised: '0 2px 8px hsl(258 30% 30% / 0.06), 0 1px 2px hsl(258 30% 30% / 0.04)',
  			floating: '0 12px 32px hsl(258 30% 30% / 0.10), 0 2px 6px hsl(258 30% 30% / 0.04)'
  		},
  		transitionTimingFunction: {
  			emph: 'cubic-bezier(0.22, 1, 0.36, 1)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [animate],
};

export default config;
