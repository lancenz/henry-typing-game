import { createApp } from 'vue'
import App from './App.vue'
import '@fontsource/atkinson-hyperlegible-next/latin-400.css'
import '@fontsource/atkinson-hyperlegible-next/latin-500.css'
import '@fontsource/atkinson-hyperlegible-next/latin-600.css'
import '@fontsource/atkinson-hyperlegible-next/latin-700.css'
import '@fontsource/atkinson-hyperlegible-next/latin-800.css'
import './style.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })
createApp(App).mount('#app')
