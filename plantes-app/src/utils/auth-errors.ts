export function authErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect',
    'auth/invalid-email': 'Adresse e-mail invalide',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail',
    'auth/weak-password': 'Mot de passe trop court (6 caractères minimum)',
    'auth/too-many-requests': 'Trop de tentatives, réessayez plus tard',
    'auth/network-request-failed': 'Pas de connexion internet',
  };
  return messages[code] ?? 'Une erreur est survenue, réessayez';
}
