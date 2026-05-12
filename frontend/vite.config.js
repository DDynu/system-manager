import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        tailwindcss(),
        react(),
        babel({ presets: [reactCompilerPreset()] }),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icons.svg', 'bg.webp'],
            manifest: {
                name: 'System Manager',
                short_name: 'SysMgr',
                description: 'Monitor system metrics and control power states remotely',
                theme_color: '#1f2937',
                background_color: '#1f2937',
                display: 'standalone',
            },
            pwaAssets: {
                disabled: false,
                config: false,
                preset: 'minimal-2023',
                image: 'public/vite-icon.svg',
                htmlPreset: '2023',
                includeHtmlHeadLinks: true,
                overrideManifestIcons: true,
                injectThemeColor: true,
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,webp}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https?:.*\/api\//i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60,
                            },
                            networkTimeoutSeconds: 3,
                        },
                    },
                ],
            },
        }),
    ],
    server: {
        host: '0.0.0.0',
    },
    build: {
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
            },
        },
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('react') && !id.includes('react-dom'))
                        return 'react-vendor'
                    if (id.includes('react-dom/client'))
                        return 'react-dom'
                    if (id.includes('react-dom'))
                        return 'react-dom-lib'
                    if (id.includes('recharts'))
                        return 'recharts'
                },
            },
        },
    },
})
