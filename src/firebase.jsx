import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDNx7yrHTQ9hZwpf_Z_9hNgGGAzDt7_OHA",
  authDomain: "bocashop.firebaseapp.com",
  projectId: "bocashop",
  storageBucket: "bocashop.appspot.com",
  messagingSenderId: "791913560797",
  appId: "1:791913560797:web:52d54df49e6d051dd2f934"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };