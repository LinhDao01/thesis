// import { createApp } from 'vue'
// import App from './App.vue'

// // Bootstrap 5 (CSS + JS cho dropdown, collapse,...)
// import 'bootstrap/dist/css/bootstrap.min.css'
// import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// import './style.css'

// createApp(App).mount('#app')

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Bootstrap
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './style.css'

createApp(App).use(router).mount('#app')
