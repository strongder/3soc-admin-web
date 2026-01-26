'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, HardDrive, Cpu, BarChart3 } from 'lucide-react';

export interface ModelStatsData {
  fps: number;
  gpuLoad: number;
  cpuLoad: number;
  memoryUsage: number;
  memoryTotal: number;
  queueLength: number;
  isOnline: boolean;
  lastUpdate: Date;
}

interface ModelStatsProps {
  stats?: ModelStatsData;
  isConnected?: boolean;
}

export const ModelStats = React.memo(function ModelStats({
  stats = {
    fps: 0,
    gpuLoad: 0,
    cpuLoad: 0,
    memoryUsage: 0,
    memoryTotal: 0,
    queueLength: 0,
    isOnline: false,
    lastUpdate: new Date()
  },
  isConnected = false
}: ModelStatsProps) {
  const memoryPercent = stats.memoryTotal > 0 ? (stats.memoryUsage / stats.memoryTotal) * 100 : 0;

  const getLoadColor = (load: number) => {
    if (load < 50) return 'text-green-600 dark:text-green-400';
    if (load < 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getMemoryColor = (percent: number) => {
    if (percent < 50) return 'bg-green-500';
    if (percent < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const StatCard = ({ icon: Icon, label, value, unit = '', color = 'text-foreground' }: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    unit?: string;
    color?: string;
  }) => (
    <Card className="flex-1">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>
              {typeof value === 'number' ? value.toFixed(1) : value}
              {unit && <span className="text-sm ml-1">{unit}</span>}
            </p>
          </div>
          <div className="text-muted-foreground">{Icon}</div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Model Monitoring</h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-sm text-red-600 dark:text-red-400">Disconnected</span>
            </>
          )}
        </div>
      </div>

      {/* Server Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity size={16} />
            Server Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${stats.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {stats.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Last update: {stats.lastUpdate.toLocaleTimeString()}
          </p>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={<Zap size={20} />}
          label="FPS"
          value={stats.fps}
          color="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={<BarChart3 size={20} />}
          label="GPU Load"
          value={stats.gpuLoad}
          unit="%"
          color={getLoadColor(stats.gpuLoad)}
        />
        <StatCard
          icon={<Cpu size={20} />}
          label="CPU Load"
          value={stats.cpuLoad}
          unit="%"
          color={getLoadColor(stats.cpuLoad)}
        />
        <StatCard
          icon={<HardDrive size={20} />}
          label="Queue"
          value={stats.queueLength}
          color="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Memory Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Memory Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {(stats.memoryUsage / 1024 / 1024).toFixed(1)}GB
              </span>
              <span className="font-medium">
                {memoryPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getMemoryColor(memoryPercent)}`}
                style={{ width: `${Math.min(memoryPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              Total: {(stats.memoryTotal / 1024 / 1024).toFixed(1)}GB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Alerts */}
      {(stats.gpuLoad > 90 || stats.cpuLoad > 90 || memoryPercent > 85) && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Zap className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" size={16} />
              <div className="space-y-1">
                <p className="font-medium text-sm">High Resource Usage</p>
                <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  {stats.gpuLoad > 90 && <p>• GPU Load is {stats.gpuLoad.toFixed(1)}%</p>}
                  {stats.cpuLoad > 90 && <p>• CPU Load is {stats.cpuLoad.toFixed(1)}%</p>}
                  {memoryPercent > 85 && <p>• Memory usage is at {memoryPercent.toFixed(1)}%</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

ModelStats.displayName = 'ModelStats';
