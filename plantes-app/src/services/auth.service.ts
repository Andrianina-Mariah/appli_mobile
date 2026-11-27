import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase/config';

export const authService = {
  login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email.trim(), password);
  },
  register(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email.trim(), password);
  },
  resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email.trim());
  },
  logout() {
    return signOut(auth);
  },
};
