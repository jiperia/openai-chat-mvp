import React, { useState } from 'react';
import { signUp, signIn, signOut } from './auth';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'login') {
      await signIn(email, password);
    } else {
      await signUp(email, password);
    }
    setEmail('');
    setPassword('');
  };

  return (
    <div style={{padding:20}}>
      <form onSubmit={handleSubmit}>
        <h3>{mode === 'login' ? 'Einloggen' : 'Registrieren'}</h3>
        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
        /><br />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={e => setPassword(e.target.value)}
        /><br />
        <button type="submit">
          {mode === 'login' ? 'Login' : 'Sign Up'}
        </button>
      </form>
      <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        Wechsel zu {mode === 'login' ? 'Registrieren' : 'Login'}
      </button>
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
