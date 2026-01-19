/**
 * pages/SignupPage.tsx
 * Page d'inscription self-service
 * - Champs: email, password, nom, nom entreprise, plan
 * - Auto-creation tenant + user + membership
 * - Redirection vers dashboard apres inscription
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import type { SignupData } from '../types/auth';

export const SignupPage: React.FC = () => {
  const [formData, setFormData] = useState<SignupData>({
    email: '',
    password: '',
    name: '',
    companyName: '',
    plan: 'starter'
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const { signup, isLoading, error, isAuthenticated, clearError } = useAuthStore();
  const navigate = useNavigate();

  // Rediriger si deja authentifie
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

  const handleChange = (field: keyof SignupData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!formData.email || !formData.password || !formData.name || !formData.companyName) {
      setFormError('Tous les champs sont requis');
      return;
    }

    if (!formData.email.includes('@')) {
      setFormError('Email invalide');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }

    if (formData.password !== confirmPassword) {
      setFormError('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      await signup(formData);
      // Navigation geree par useEffect au-dessus
    } catch (err: any) {
      console.error('Signup error:', err);
    }
  };

  const displayError = formError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo et titre */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              M.A.X.
            </h1>
            <p className="text-gray-600">
              Creez votre compte CRM
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Erreur globale */}
            {displayError && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                {displayError}
              </div>
            )}

            {/* Nom complet */}
            <Input
              type="text"
              label="Votre nom complet"
              value={formData.name}
              onChange={handleChange('name')}
              placeholder="Jean Dupont"
              required
              autoComplete="name"
              autoFocus
            />

            {/* Email */}
            <Input
              type="email"
              label="Email professionnel"
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="jean@monentreprise.com"
              required
              autoComplete="email"
            />

            {/* Nom entreprise */}
            <Input
              type="text"
              label="Nom de votre entreprise"
              value={formData.companyName}
              onChange={handleChange('companyName')}
              placeholder="Mon Entreprise SARL"
              required
              autoComplete="organization"
            />

            {/* Password */}
            <Input
              type="password"
              label="Mot de passe"
              value={formData.password}
              onChange={handleChange('password')}
              placeholder="Min. 6 caracteres"
              required
              autoComplete="new-password"
            />

            {/* Confirm Password */}
            <Input
              type="password"
              label="Confirmer le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez votre mot de passe"
              required
              autoComplete="new-password"
            />

            {/* Selection du plan */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Choisissez votre formule
              </label>

              <div className="grid grid-cols-1 gap-3">
                {/* Plan Starter */}
                <label
                  className={`relative flex cursor-pointer rounded-xl border-2 p-4 transition-all ${
                    formData.plan === 'starter'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value="starter"
                    checked={formData.plan === 'starter'}
                    onChange={() => setFormData(prev => ({ ...prev, plan: 'starter' }))}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Starter</span>
                      <span className="text-lg font-bold text-gray-900">131&#8239;&#8364;/mois</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      CRM complet: Email, SMS, Campagnes
                    </p>
                  </div>
                  {formData.plan === 'starter' && (
                    <div className="ml-3 flex items-center">
                      <span className="text-blue-600 text-xl">&#10003;</span>
                    </div>
                  )}
                </label>

                {/* Plan Starter + WhatsApp */}
                <label
                  className={`relative flex cursor-pointer rounded-xl border-2 p-4 transition-all ${
                    formData.plan === 'starter_whatsapp'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value="starter_whatsapp"
                    checked={formData.plan === 'starter_whatsapp'}
                    onChange={() => setFormData(prev => ({ ...prev, plan: 'starter_whatsapp' }))}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Starter + WhatsApp</span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Populaire
                        </span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">164&#8239;&#8364;/mois</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      Tout Starter + WhatsApp Pro (100 msg/mois inclus)
                    </p>
                  </div>
                  {formData.plan === 'starter_whatsapp' && (
                    <div className="ml-3 flex items-center">
                      <span className="text-green-600 text-xl">&#10003;</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Bouton submit */}
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Creer mon compte
            </Button>

            {/* Note */}
            <p className="text-xs text-gray-500 text-center">
              En creant un compte, vous acceptez nos conditions d'utilisation.
              <br />
              Le paiement sera configure apres validation de votre compte.
            </p>
          </form>

          {/* Lien vers connexion */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              Deja un compte?{' '}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>M.A.X. CRM - MaCrea 2025</p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;