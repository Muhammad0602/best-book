import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { BiArrowBack } from 'react-icons/bi';
import {
  accountsAvailable, signIn, signUp, signOut, sendPasswordReset, updatePassword,
} from '../lib/sync';

function Account() {
  const navigate = useNavigate();
  const { user, ready, recovery } = useSelector((store) => store.auth);
  const { items, outbox, sync } = useSelector((store) => store.annotations);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const count = Object.keys(items).length;
  const waiting = Object.keys(outbox).length;

  const attempt = async (action, success) => {
    setBusy(true);
    setError('');
    setNotice('');
    const message = await action();
    setBusy(false);
    if (message) setError(message); else setNotice(success);
    return !message;
  };

  const onSignIn = async (event) => {
    event.preventDefault();
    if (await attempt(() => signIn(email, password), '')) setPassword('');
  };

  const onSignUp = () => {
    if (password.length < 8) {
      setError('Please choose a password with at least 8 characters.');
      return;
    }
    attempt(
      () => signUp(email, password),
      'Account created. If a confirmation email arrives, open its link and then sign in.',
    );
  };

  const onReset = () => {
    if (!email) {
      setError('Type your email address first.');
      return;
    }
    attempt(() => sendPasswordReset(email), 'A link to choose a new password is on its way.');
  };

  const onNewPassword = async (event) => {
    event.preventDefault();
    if (await attempt(() => updatePassword(password), 'Your new password is saved.')) setPassword('');
  };

  let body;
  if (!accountsAvailable) {
    body = (
      <p>
        Accounts are not switched on for this copy of the app yet. Your
        {` ${count} `}
        highlights and drawings are saved on this device only.
      </p>
    );
  } else if (!ready) {
    body = <p>Checking your account…</p>;
  } else if (user && recovery) {
    body = (
      <form onSubmit={onNewPassword}>
        <p>{`Choose a new password for ${user.email}.`}</p>
        <label htmlFor="new-password">
          New password
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="plain-button" disabled={busy}>Save password</button>
      </form>
    );
  } else if (user) {
    body = (
      <>
        <p>
          Signed in as
          {' '}
          <strong>{user.email}</strong>
        </p>
        <p>
          {`${count} ${count === 1 ? 'mark' : 'marks'} in your account. `}
          {waiting > 0
            ? `${waiting} still waiting to be sent (${sync === 'offline' ? 'you are offline' : 'sending'}).`
            : 'Everything is saved.'}
        </p>
        <button
          type="button"
          className="plain-button"
          disabled={busy}
          onClick={() => attempt(signOut, '')}
        >
          Sign out
        </button>
      </>
    );
  } else {
    body = (
      <form onSubmit={onSignIn}>
        <p>
          Sign in to keep your highlights and drawings in your own account and
          see them on every device.
          {count > 0 ? ` The ${count} you already made here will be added to your account.` : ''}
        </p>
        <label htmlFor="email">
          Email
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label htmlFor="password">
          Password
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="account-actions">
          <button type="submit" className="plain-button" disabled={busy}>Sign in</button>
          <button type="button" className="plain-button secondary" disabled={busy} onClick={onSignUp}>
            Create account
          </button>
        </div>
        <button type="button" className="link-button" disabled={busy} onClick={onReset}>
          Forgot your password?
        </button>
      </form>
    );
  }

  return (
    <div className="details account">
      <button className="back-button" onClick={() => navigate(-1)} type="button">
        <BiArrowBack aria-hidden="true" />
        <span className="visually-hidden">Go back</span>
      </button>
      <div className="account-card">
        <h2>Your account</h2>
        {body}
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
      </div>
    </div>
  );
}

export default Account;
