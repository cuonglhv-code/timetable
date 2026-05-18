'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shield, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useCentres } from '@/hooks/use-centres';
import { useGoogleIntegration, useConfigureGoogleIntegration } from '@/hooks/use-google-integration';
import { encrypt } from '@/lib/crypto';

export default function GoogleSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const centreId = params.id as string;

  const { data: centres } = useCentres();
  const { data: integration, isLoading } = useGoogleIntegration(centreId);
  const configureIntegration = useConfigureGoogleIntegration();

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [serviceAccountKey, setServiceAccountKey] = useState('');
  const [verifiedDomain, setVerifiedDomain] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const centre = centres?.find((c) => c.id === centreId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!clientId || !clientSecret || !serviceAccountEmail || !serviceAccountKey || !verifiedDomain) {
      setError('All fields are required');
      return;
    }

    try {
      const encryptedKey = encrypt(serviceAccountKey);

      await configureIntegration.mutateAsync({
        centreId,
        clientId,
        clientSecret,
        serviceAccountEmail,
        serviceAccountKey: encryptedKey,
        verifiedDomain,
      });

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure integration');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block"
          >
            ← Back to Centres
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Google Calendar Settings
          </h1>
          <p className="text-gray-500 mt-1">
            Configure Google Workspace integration for {centre?.name}
          </p>
        </div>

        {integration?.configured && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-medium text-green-800">Integration Configured</h3>
            </div>
            <div className="mt-2 text-sm text-green-700 space-y-1">
              <p>Service Account: {integration.serviceAccountEmail}</p>
              <p>Verified Domain: @{integration.verifiedDomain}</p>
              <p>Status: {integration.isDomainVerified ? 'Verified' : 'Not verified'}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">Google integration configured successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Service Account Configuration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Numeric client ID from Google Cloud"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Found in Service Account → Keys → Client ID
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Secret
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Client secret"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Account Email
            </label>
            <input
              type="email"
              value={serviceAccountEmail}
              onChange={(e) => setServiceAccountEmail(e.target.value)}
              placeholder="timetable-sync@your-project.iam.gserviceaccount.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Account Key (JSON)
            </label>
            <div className="relative">
              <textarea
                value={serviceAccountKey}
                onChange={(e) => setServiceAccountKey(e.target.value)}
                placeholder='Paste the entire JSON key content here...'
                rows={6}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Paste the contents of the downloaded JSON key file. It will be encrypted before storage.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verified Domain
            </label>
            <input
              type="text"
              value={verifiedDomain}
              onChange={(e) => setVerifiedDomain(e.target.value.toLowerCase())}
              placeholder="school.edu"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Only emails from this domain will be allowed for calendar sharing.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={configureIntegration.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {configureIntegration.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Configuring...
                </>
              ) : (
                'Save Configuration'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">Setup Checklist</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Create a Google Cloud Project and enable Calendar API</li>
            <li>2. Create a Service Account with Domain-Wide Delegation enabled</li>
            <li>3. Download the JSON key file</li>
            <li>4. In Google Admin Console → Security → API Controls → Domain-wide Delegation, add the service account Client ID with scope: <code className="bg-blue-100 px-1 rounded">https://www.googleapis.com/auth/calendar.events</code></li>
            <li>5. Fill in the form above with your credentials</li>
          </ul>
          <a
            href="/GOOGLE_CALENDAR_SETUP.md"
            target="_blank"
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 underline"
          >
            View full setup guide →
          </a>
        </div>
      </div>
    </div>
  );
}
