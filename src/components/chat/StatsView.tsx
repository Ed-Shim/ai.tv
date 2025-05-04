'use client';

import React from 'react';
import { ChatStatistics } from '@/services/chatService';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StatsViewProps {
  statistics: ChatStatistics;
}

/**
 * Component to display viewer statistics
 */
export default function StatsView({ statistics }: StatsViewProps) {
  // Calculate percentages for pie chart
  const calculatePercentage = (value: number, total: number): number => {
    return total === 0 ? 0 : Math.round((value / total) * 100);
  };

  const totalGender = 
    statistics.gender.male + 
    statistics.gender.female + 
    statistics.gender.unknown;

  const malePercentage = calculatePercentage(statistics.gender.male, totalGender);
  const femalePercentage = calculatePercentage(statistics.gender.female, totalGender);
  const unknownPercentage = calculatePercentage(statistics.gender.unknown, totalGender);

  // Simple CSS-based pie chart using conic-gradient
  const getPieChartStyle = () => {
    return {
      background: `conic-gradient(
        #3b82f6 0% ${malePercentage}%, 
        #ec4899 ${malePercentage}% ${malePercentage + femalePercentage}%, 
        #94a3b8 ${malePercentage + femalePercentage}% 100%
      )`
    };
  };

  return (
    <ScrollArea className="h-full w-full pr-4">
      <div className="flex flex-col space-y-6 p-4">
        <h3 className="text-sm font-medium">Gender Distribution</h3>
        
        {/* Pie chart */}
        <div className="flex flex-col items-center">
          <div 
            className="w-32 h-32 rounded-full" 
            style={getPieChartStyle()} 
          />
          
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs w-full">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
              <span>Male: {statistics.gender.male} ({malePercentage}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-pink-500 rounded-full mr-2" />
              <span>Female: {statistics.gender.female} ({femalePercentage}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-slate-400 rounded-full mr-2" />
              <span>Other: {statistics.gender.unknown} ({unknownPercentage}%)</span>
            </div>
          </div>
        </div>
        
        <h3 className="text-sm font-medium mt-6">Interest Levels</h3>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-gray-100 p-2 rounded-md text-center">
            <div className="font-bold text-green-600 text-lg">
              {statistics.interestLevel.high}
            </div>
            <div>High</div>
          </div>
          <div className="bg-gray-100 p-2 rounded-md text-center">
            <div className="font-bold text-yellow-600 text-lg">
              {statistics.interestLevel.mid}
            </div>
            <div>Medium</div>
          </div>
          <div className="bg-gray-100 p-2 rounded-md text-center">
            <div className="font-bold text-red-600 text-lg">
              {statistics.interestLevel.low}
            </div>
            <div>Low</div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}