import { ShareStatus } from '@/types';
import { CheckCircle, Clock, AlertCircle, XCircle, Send } from 'lucide-react';

interface ShareStatusBadgeProps {
  status: ShareStatus;
  onRetry?: () => void;
}

const STATUS_CONFIG: Record<ShareStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}> = {
  PENDING: {
    label: 'Pending',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: <Clock className="w-3 h-3" />,
  },
  SENT: {
    label: 'Invite Sent',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: <Send className="w-3 h-3" />,
  },
  ACCEPTED: {
    label: 'Active',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  FAILED: {
    label: 'Failed',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  REVOKED: {
    label: 'Revoked',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    icon: <XCircle className="w-3 h-3" />,
  },
};

export function ShareStatusBadge({ status, onRetry }: ShareStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      {config.icon}
      {config.label}
      {status === 'FAILED' && onRetry && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="ml-1 underline hover:no-underline"
        >
          Retry
        </button>
      )}
    </span>
  );
}
