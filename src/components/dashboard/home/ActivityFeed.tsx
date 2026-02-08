import { ReactNode } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';

interface ActivityFeedProps {
  title?: string;
  items: Array<{
    id: string;
    title: string;
    description?: string;
    timestamp?: string;
    icon?: ReactNode;
    badge?: {
      label: string;
      variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    };
    onClick?: () => void;
  }>;
  emptyMessage?: string;
  loading?: boolean;
}

export function ActivityFeed({
  title = 'Recent Activity',
  items,
  emptyMessage = 'No activity yet',
  loading = false,
}: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse w-3/4" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card
          key={item.id}
          className={item.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
          onClick={item.onClick}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {item.icon && (
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  {item.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  {item.badge && (
                    <Badge variant={item.badge.variant || 'secondary'} className="flex-shrink-0">
                      {item.badge.label}
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 truncate">{item.description}</p>
                )}
                {item.timestamp && (
                  <p className="text-xs text-gray-500 mt-1">{item.timestamp}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
