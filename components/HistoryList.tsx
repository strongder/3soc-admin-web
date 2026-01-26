'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Trash2 } from 'lucide-react';

interface HistoryItem {
  id: string;
  filename: string;
  uploadedAt: Date;
  status: 'processing' | 'done' | 'error';
  thumbnail?: string;
  resultCount?: number;
  duration?: number;
}

interface HistoryListProps {
  items?: HistoryItem[];
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export const HistoryList = React.memo(function HistoryList({
  items = [],
  onView,
  onDelete,
  isLoading = false
}: HistoryListProps) {
  const [filteredItems, setFilteredItems] = useState<HistoryItem[]>(items);
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  useEffect(() => {
    let sorted = [...items];
    if (sortBy === 'date') {
      sorted.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } else {
      sorted.sort((a, b) => a.filename.localeCompare(b.filename));
    }
    setFilteredItems(sorted);
  }, [items, sortBy]);

  const getStatusColor = (status: HistoryItem['status']) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'done':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'error':
        return 'bg-red-500/20 text-red-700 dark:text-red-400';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 60000) % 60);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Detection History</h3>
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('date')}
          >
            Date
          </Button>
          <Button
            variant={sortBy === 'name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('name')}
          >
            Name
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Loading history...
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No videos processed yet. Upload a video to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredItems.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="w-24 h-24 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail || "/placeholder.svg"}
                        alt={item.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No preview
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <p className="font-medium truncate">{item.filename}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(item.uploadedAt)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status === 'processing' && 'Processing...'}
                        {item.status === 'done' && 'Done'}
                        {item.status === 'error' && 'Error'}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                      {item.duration && (
                        <span>Duration: {formatDuration(item.duration)}</span>
                      )}
                      {item.resultCount !== undefined && (
                        <span>Detections: {item.resultCount}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onView?.(item.id)}
                        disabled={item.status !== 'done'}
                      >
                        <Eye size={16} className="mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete?.(item.id)}
                      >
                        <Trash2 size={16} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
});

HistoryList.displayName = 'HistoryList';
