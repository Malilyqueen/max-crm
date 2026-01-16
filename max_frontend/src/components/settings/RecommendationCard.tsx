/**
 * Carte de recommandations pour guider l'utilisateur
 * Affichée sur la page Settings pour orienter vers Email en premier
 */

interface RecommendationCardProps {
  className?: string;
}

export function RecommendationCard({ className = '' }: RecommendationCardProps) {
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">💡</span>
        <div className="flex-1">
          <p className="text-sm text-blue-900 font-medium mb-1">
            Recommandation
          </p>
          <p className="text-sm text-blue-800">
            Commencez par configurer <strong>Email</strong> pour envoyer vos newsletters et emails transactionnels.
            SMS et WhatsApp peuvent être ajoutés plus tard selon vos besoins.
          </p>
        </div>
      </div>
    </div>
  );
}
