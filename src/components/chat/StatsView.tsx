'use client';

import React, { useState, useMemo } from 'react';
import { ChatStatistics } from '@/services/chatService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface StatsViewProps {
  statistics: ChatStatistics;
}

type InterestFilter = 'all' | 'high' | 'mid' | 'low';

/**
 * Component to display viewer statistics
 */
export default function StatsView({ statistics }: StatsViewProps) {
  // Filter state
  const [interestFilter, setInterestFilter] = useState<InterestFilter>('all');
  
  // Calculate percentages for pie chart
  const calculatePercentage = (value: number, total: number): number => {
    return total === 0 ? 0 : Math.round((value / total) * 100);
  };

  // Calculate total gender counts
  const totalGender = 
    statistics.gender.male + 
    statistics.gender.female + 
    statistics.gender.unknown;

  // Calculate gender percentages
  const malePercentage = calculatePercentage(statistics.gender.male, totalGender);
  const femalePercentage = calculatePercentage(statistics.gender.female, totalGender);
  const unknownPercentage = calculatePercentage(statistics.gender.unknown, totalGender);

  // Calculate total interest level
  const totalInterest = 
    statistics.interestLevel.high + 
    statistics.interestLevel.mid + 
    statistics.interestLevel.low;

  // Calculate interest level percentages
  const highPercentage = calculatePercentage(statistics.interestLevel.high, totalInterest);
  const midPercentage = calculatePercentage(statistics.interestLevel.mid, totalInterest);
  const lowPercentage = calculatePercentage(statistics.interestLevel.low, totalInterest);

  // Filter the chat statistics based on selected interest level
  const filteredStats = useMemo(() => {
    // For now, we're just showing stats differently, not actually filtering the data
    // In a real app, you would filter chatMessages based on interestFilter
    return statistics;
  }, [statistics, interestFilter]);

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
        {/* Filters section */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Filter Statistics</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-xs text-muted-foreground">Interest Level</label>
              <Select 
                value={interestFilter} 
                onValueChange={(value) => setInterestFilter(value as InterestFilter)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select interest level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="high">High Interest</SelectItem>
                  <SelectItem value="mid">Medium Interest</SelectItem>
                  <SelectItem value="low">Low Interest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Gender distribution section */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Gender Distribution</h3>
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
        </Card>
        
        {/* Interest levels section */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-3">Interest Levels</h3>
          
          {/* Interest level bar chart */}
          <div className="flex flex-col space-y-4 mt-2">
            {/* High interest */}
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">High Interest</span>
                <span>{statistics.interestLevel.high} ({highPercentage}%)</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${highPercentage}%` }}
                />
              </div>
            </div>
            
            {/* Medium interest */}
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">Medium Interest</span>
                <span>{statistics.interestLevel.mid} ({midPercentage}%)</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 rounded-full" 
                  style={{ width: `${midPercentage}%` }}
                />
              </div>
            </div>
            
            {/* Low interest */}
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">Low Interest</span>
                <span>{statistics.interestLevel.low} ({lowPercentage}%)</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full" 
                  style={{ width: `${lowPercentage}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Additional statistics based on filter */}
          {interestFilter !== 'all' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-xs font-medium mb-2">
                {interestFilter === 'high' ? 'High' : interestFilter === 'mid' ? 'Medium' : 'Low'} Interest Details
              </h4>
              <div className="text-xs text-muted-foreground">
                {interestFilter === 'high' && `${highPercentage}% of viewers showed high interest`}
                {interestFilter === 'mid' && `${midPercentage}% of viewers showed medium interest`}
                {interestFilter === 'low' && `${lowPercentage}% of viewers showed low interest`}
              </div>
            </div>
          )}
        </Card>
      </div>
    </ScrollArea>
  );
}