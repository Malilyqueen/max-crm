/**
 * components/automation/AutoGuardConfig.tsx
 * Affiche la configuration auto-guard (auto.json)
 */

import React from 'react';
import { Shield, Clock, Zap, CheckCircle, XCircle } from 'lucide-react';

interface AutoGuardConfigProps {
  config: {
    enabled: boolean;
    allowed: string[];
    rateLimitPerHour: number;
    schedule: {
      start: string;
      end: string;
    };
  };
}

export function AutoGuardConfig({ config }: AutoGuardConfigProps) {
  return (
    <div
      className="relative rounded-lg overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 250, 251, 0.95))',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 40px rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.15)'
      }}
    >
      {/* Animated gradient border */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.4), rgba(147, 51, 234, 0.4), rgba(59, 130, 246, 0.4))',
          backgroundSize: '200% 100%',
          animation: 'gradient 3s ease infinite'
        }}
      />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-lg transition-all duration-300 hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
          >
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3
              className="text-lg font-semibold"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Auto-Guard
            </h3>
            <p className="text-sm text-gray-600">Protection et limites des automatisations</p>
          </div>
          <div className="ml-auto">
            {config.enabled ? (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1))',
                  color: '#166534',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)'
                }}
              >
                <CheckCircle className="w-3 h-3" />
                Actif
              </span>
            ) : (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))',
                  color: '#991b1b',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
                }}
              >
                <XCircle className="w-3 h-3" />
                Inactif
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Horaires */}
          <div
            className="rounded-lg p-4 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05))',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600 transition-transform duration-300 hover:scale-110" />
              <span className="text-sm font-medium text-gray-700">Horaires autorisés</span>
            </div>
            <div
              className="text-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {config.schedule.start} - {config.schedule.end}
            </div>
            <p className="text-xs text-gray-500 mt-1">Exécutions limitées à ces horaires</p>
          </div>

          {/* Rate limit */}
          <div
            className="rounded-lg p-4 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.05), rgba(234, 88, 12, 0.05))',
              border: '1px solid rgba(249, 115, 22, 0.15)',
              boxShadow: '0 2px 8px rgba(249, 115, 22, 0.1)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-orange-600 transition-transform duration-300 hover:scale-110" />
              <span className="text-sm font-medium text-gray-700">Rate Limit</span>
            </div>
            <div
              className="text-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {config.rateLimitPerHour}/h
            </div>
            <p className="text-xs text-gray-500 mt-1">Exécutions max par heure</p>
          </div>

          {/* Workflows autorisés */}
          <div
            className="rounded-lg p-4 transition-all duration-300 hover:scale-105 hover:shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(22, 163, 74, 0.05))',
              border: '1px solid rgba(34, 197, 94, 0.15)',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.1)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600 transition-transform duration-300 hover:scale-110" />
              <span className="text-sm font-medium text-gray-700">Workflows auto</span>
            </div>
            <div
              className="text-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {config.allowed.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Autorisés en mode auto</p>
          </div>
        </div>

        {/* Liste des workflows autorisés */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Workflows autorisés en mode automatique</h4>
          <div className="flex flex-wrap gap-2">
            {config.allowed.map((workflow) => (
              <span
                key={workflow}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1))',
                  color: '#166534',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  boxShadow: '0 2px 4px rgba(34, 197, 94, 0.15)'
                }}
              >
                {workflow}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
