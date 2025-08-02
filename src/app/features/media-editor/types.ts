import React from 'react';

// Define a type for the analysis data structure
export interface AnalysisScore {
    score: number;
    comment: string;
}
export interface Suggestion {
    type: 'success' | 'warning';
    text: string;
}
export interface AnalysisData {
    readability: AnalysisScore;
    engagement: AnalysisScore;
    keywords: AnalysisScore;
    suggestions: Suggestion[];
}

// Define a type for Platform data
export interface Platform {
    id: string;
    name: string;
    icon: React.ElementType; // Use React.ElementType for component types
    limit: string;
}
