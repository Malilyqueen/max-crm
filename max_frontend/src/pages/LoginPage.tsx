/**
 * pages/LoginPage.tsx
 * Page de connexion avec formulaire email/password
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore();
  const navigate = useNavigate();

  // Rediriger si déjà authentifié
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear error quand composant unmount
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation basique
    if (!email || !password) {
      setFormError('Email et mot de passe requis');
      return;
    }

    if (!email.includes('@')) {
      setFormError('Email invalide');
      return;
    }

    try {
      await login(email, password);
      // Navigation gérée par useEffect au-dessus
    } catch (err: any) {
      // Erreur déjà stockée dans le store
      console.error('Login error:', err);
    }
  };

  const displayError = formError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo et titre */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              M.A.X.
            </h1>
            <p className="text-gray-600">
              Connectez-vous à votre espace
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Erreur globale */}
            {displayError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {displayError}
              </div>
            )}

            {/* Email */}
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@macrea.fr"
              required
              autoComplete="email"
              autoFocus
            />

            {/* Password */}
            <Input
              type="password"
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            {/* Bouton submit */}
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Se connecter
            </Button>
          </form>

          {/* Info MVP1 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-700 mb-2">MVP1 - Comptes de test :</p>
              <div className="bg-gray-50 p-2 rounded">
                <p><span className="font-mono">admin@macrea.fr</span> / <span className="font-mono">admin123</span></p>
                <p className="text-gray-400 mt-0.5">→ Accès administrateur</p>
              </div>
              <div className="bg-gray-50 p-2 rounded mt-2">
                <p><span className="font-mono">user@macrea.fr</span> / <span className="font-mono">user123</span></p>
                <p className="text-gray-400 mt-0.5">→ Accès utilisateur</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>M.A.X. MVP1 - MaCréa © 2025</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
