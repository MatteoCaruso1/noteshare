import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			display: [
  				'Playfair Display',
  				'Georgia',
  				'serif'
  			],
  			body: [
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			sans: [
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			serif: [
  				'Lora',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'Space Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			note: {
  				DEFAULT: 'hsl(var(--note))',
  				foreground: 'hsl(var(--note-foreground))',
  				border: 'hsl(var(--note-border))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			jazz: {
  				gold: 'hsl(var(--jazz-gold))',
  				'gold-glow': 'hsl(var(--jazz-gold-glow))',
  				amber: 'hsl(var(--jazz-amber))',
  				cream: 'hsl(var(--jazz-cream))',
  				midnight: 'hsl(var(--jazz-midnight))',
  				'deep-blue': 'hsl(var(--jazz-deep-blue))',
  				purple: 'hsl(var(--jazz-purple))',
  				'warm-black': 'hsl(var(--jazz-warm-black))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
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
  			},
  			shimmer: {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			},
  			pulse: {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'50%': {
  					opacity: '0.5'
  				}
  			},
  			slideUp: {
  				from: {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			slideDown: {
  				from: {
  					opacity: '0',
  					transform: 'translateY(-10px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			scaleIn: {
  				from: {
  					opacity: '0',
  					transform: 'scale(0.95)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
			floatDown: {
				'0%': {
					transform: 'translateY(-20vh) rotate(0deg)'
				},
				'100%': {
					transform: 'translateY(105vh) rotate(360deg)'
				}
			},
			heroEnter: {
				'0%': {
					opacity: '0',
					filter: 'blur(8px)',
					transform: 'scale(0.98)'
				},
				'100%': {
					opacity: '1',
					filter: 'blur(0px)',
					transform: 'scale(1)'
				}
			},
			authEnter: {
				'0%': {
					opacity: '0',
					filter: 'blur(12px)',
					transform: 'scale(0.96) translateY(20px)'
				},
				'100%': {
					opacity: '1',
					filter: 'blur(0px)',
					transform: 'scale(1) translateY(0)'
				}
			},
			'pulse-glow': {
				'0%, 100%': {
					opacity: '1',
					filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))'
				},
				'50%': {
					opacity: '0.9',
					filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.7))'
				}
			},
			'pulse-glow-medium': {
				'0%, 100%': {
					opacity: '1',
					filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.6))'
				},
				'50%': {
					opacity: '0.85',
					filter: 'drop-shadow(0 0 10px hsl(var(--primary) / 0.85))'
				}
			},
			'pulse-glow-intense': {
				'0%, 100%': {
					opacity: '1',
					filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.7))'
				},
				'50%': {
					opacity: '0.8',
					filter: 'drop-shadow(0 0 14px hsl(var(--primary) / 1))'
				}
			},
			'fade-in-slow': {
				'0%': {
					opacity: '0'
				},
				'100%': {
					opacity: '1'
				}
			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			shimmer: 'shimmer 2s linear infinite',
  			pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			slideUp: 'slideUp 0.3s ease-out',
  			slideDown: 'slideDown 0.3s ease-out',
  			scaleIn: 'scaleIn 0.2s ease-out',
  			'float-down': 'floatDown 30s linear infinite',
  			'hero-enter': 'heroEnter 0.6s ease-out forwards',
  			'auth-enter': 'authEnter 0.5s ease-out forwards',
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  			'pulse-glow-medium': 'pulse-glow-medium 1.8s ease-in-out infinite',
  			'pulse-glow-intense': 'pulse-glow-intense 1.5s ease-in-out infinite',
  			'fade-in-slow': 'fade-in-slow 0.6s ease-out forwards'
  		},
		backgroundImage: {
			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
