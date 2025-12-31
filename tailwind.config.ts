// tailwind.config.js
module.exports = {
    theme: {
        extend: {
            keyframes: {
                glow: {
                    '0%, 100%': {
                        boxShadow: '0 0 5px rgb(59 130 246 / 40%), 0 0 15px rgb(59 130 246 / 20%)',
                    },
                    '50%': {
                        boxShadow: '0 0 15px rgb(59 130 246 / 80%), 0 0 30px rgb(59 130 246 / 60%)',
                    },
                },
            },
            animation: {
                glow: 'glow 3s ease-in-out infinite',
            },
        },
    },
    plugins: [],
}
