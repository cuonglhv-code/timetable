import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface GoogleIntegrationStatus {
  configured: boolean;
  serviceAccountEmail?: string;
  verifiedDomain?: string;
  isDomainVerified?: boolean;
}

export function useGoogleIntegration(centreId: string) {
  return useQuery<GoogleIntegrationStatus>({
    queryKey: ['google-integration', centreId],
    queryFn: async () => {
      const res = await fetch(`/api/google/integration?centreId=${centreId}`);
      if (!res.ok) throw new Error('Failed to fetch Google integration');
      return res.json();
    },
    enabled: !!centreId,
  });
}

export function useConfigureGoogleIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      centreId: string;
      clientId: string;
      clientSecret: string;
      serviceAccountEmail: string;
      serviceAccountKey: string;
      verifiedDomain: string;
    }) => {
      const res = await fetch('/api/google/integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to configure Google integration');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['google-integration', variables.centreId] });
    },
  });
}
