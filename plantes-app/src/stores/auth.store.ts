import { defineStore } from 'pinia';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase/config';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    ready: false,
  }),
  actions: {
    init() {
      return new Promise<void>((resolve) => {
        onAuthStateChanged(auth, (user) => {
          this.user = user;
          this.ready = true;
          resolve();
        });
      });
    },
  },
});
