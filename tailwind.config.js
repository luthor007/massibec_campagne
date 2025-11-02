
/* @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [ 
	  "./app/**/*.{js,ts,jsx,tsx}", 
	  "./pages/**/*.{js,ts,jsx,tsx}", 
	  "./components/**/*.{js,ts,jsx,tsx}", 
		
	  // Or if using `src` directory: 
	  "./src/**/*.{js,ts,jsx,tsx}", 
	], 
	theme: {
    	extend: {
    		colors: {
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
    			popover: {
    				DEFAULT: 'hsl(var(--popover-background))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent-background))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted-background))',
    				foreground: 'hsl(var(--muted-foreground))'
    			}
    		},
			// Mobile-friendly spacing with safe areas
			spacing: {
				'safe': 'env(safe-area-inset-bottom)',
				'safe-top': 'env(safe-area-inset-top)',
				'safe-right': 'env(safe-area-inset-right)',
				'safe-left': 'env(safe-area-inset-left)',
			}
    	}
    }, 
	plugins: [], 
}