/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            keyframes: {
                'reveal-slide-up': {
                    '0%': { opacity: '0', transform: 'translateY(100%)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                'reveal': 'reveal-slide-up 0.8s ease-out 0.5s forwards',
            },
        },
    },
    plugins: [],
}
